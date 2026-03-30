import os
import json
import logging
import redis.asyncio as redis

logger = logging.getLogger("processing_service")

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))

class RedisCache:
    def __init__(self):
        self.pool = redis.ConnectionPool(
            host=REDIS_HOST, 
            port=REDIS_PORT, 
            decode_responses=True
        )
        self.redis = redis.Redis(connection_pool=self.pool)

    async def store_flow(self, flow_id: str, flow_record: dict, ttl: int = 300):
        """Stores a flow record in Redis with a TTL."""
        key = f"flow:{flow_id}"
        try:
            # Store as JSON string 
            await self.redis.set(key, json.dumps(flow_record), ex=ttl)
        except Exception as e:
            logger.error(f"Redis store_flow error: {e}")

    async def get_flow(self, flow_id: str):
        """Retrieves a single flow record."""
        key = f"flow:{flow_id}"
        try:
            data = await self.redis.get(key)
            if data:
                return json.loads(data)
        except Exception as e:
            logger.error(f"Redis get_flow error: {e}")
        return None

    async def get_active_flows(self, limit: int = 100):
        """Scans keys matching prefix and returns Active flows."""
        flows = []
        try:
            cursor = 0
            # Scan returns (cursor, [keys])
            while True:
                cursor, keys = await self.redis.scan(cursor=cursor, match="flow:*", count=100)
                for key in keys:
                    data = await self.redis.get(key)
                    if data:
                        flows.append(json.loads(data))
                    if len(flows) >= limit:
                        return flows
                if cursor == 0:
                    break
        except Exception as e:
            logger.error(f"Redis get_active_flows error: {e}")
        return flows
        
    async def close(self):
        try:
            await self.redis.close()
            await self.pool.disconnect()
        except Exception:
            pass
