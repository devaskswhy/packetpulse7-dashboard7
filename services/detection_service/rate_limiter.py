import time
import json
import logging
from datetime import datetime
import redis.asyncio as redis

logger = logging.getLogger("detection_service")

class RateLimiter:
    def __init__(self, redis_host="localhost", redis_port=6379, producer=None, alert_topic="alerts"):
        self.pool = redis.ConnectionPool(
            host=redis_host, 
            port=redis_port, 
            decode_responses=True
        )
        self.redis = redis.Redis(connection_pool=self.pool)
        self.producer = producer
        self.alert_topic = alert_topic

    async def is_rate_limited(self, ip: str, window_s: int = 60, max_packets: int = 1000) -> bool:
        """
        Sliding window rate limit using Redis Sorted Sets. 
        Returns True if the IP exceeded the max allowed packets within window_s.
        """
        key = f"rl:{ip}"
        now = time.time()
        window_start = now - window_s
        
        try:
            # We use a pipeline for atomic operations
            async with self.redis.pipeline(transaction=True) as pipe:
                # 1. Remove elements older than window_start
                pipe.zremrangebyscore(key, 0, window_start)
                # 2. Add current packet count (using timestamp as score AND value to make it unique)
                pipe.zadd(key, {f"{now}": now})
                # 3. Count elements in the window
                pipe.zcard(key)
                # 4. Set expiry to auto-clean up sorted sets
                pipe.expire(key, window_s + 10)
                
                results = await pipe.execute()
                
            current_count = results[2]
            
            if current_count > max_packets:
                await self._trigger_alert(ip, current_count, window_s, max_packets)
                return True
                
            return False
        except Exception as e:
            logger.error(f"Redis rate_limiter error: {e}")
            # Fail closed or open? Since it's passive detection, fail open (False) so we don't crash.
            return False

    async def _trigger_alert(self, ip: str, current_count: int, window_s: int, max_packets: int):
        if not self.producer:
            return
            
        alert = {
            "alert_type": "RateLimitExceeded",
            "severity": "HIGH",
            "message": f"IP {ip} exceeded rate limit. Sent {current_count} pkts in {window_s}s (max: {max_packets}).",
            "flow_id": f"{ip}-rate-limit",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
        try:
            self.producer.produce(
                self.alert_topic,
                value=json.dumps(alert)
            )
            # Not polling immediately to prevent blocking async loop, 
            # producer client polls externally in main loop naturally.
            logger.warning(alert["message"])
        except Exception as e:
            logger.error(f"Failed producing alert for rate limiter: {e}")

    async def close(self):
        try:
            await self.redis.close()
            await self.pool.disconnect()
        except Exception:
            pass
