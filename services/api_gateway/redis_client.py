import os
import json
import logging
import redis.asyncio as redis
from typing import Optional, List, Dict, Any

logger = logging.getLogger("api_gateway")

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))

pool = redis.ConnectionPool(
    host=REDIS_HOST, 
    port=REDIS_PORT, 
    decode_responses=True
)
redis_client = redis.Redis(connection_pool=pool)

async def get_active_flows(limit: int = 100) -> Optional[List[Dict[str, Any]]]:
    """Scans and retrieves active flows from Redis. Returns None on failure so we can fallback."""
    flows = []
    try:
        cursor = 0
        while True:
            cursor, keys = await redis_client.scan(cursor=cursor, match="flow:*", count=100)
            if keys:
                # Fetch all keys found in this scan batch
                pipe = redis_client.pipeline()
                for k in keys:
                    pipe.get(k)
                results = await pipe.execute()
                for data in results:
                    if data:
                        flows.append(json.loads(data))
                if len(flows) >= limit:
                    break
            if cursor == 0:
                break
                
        # To maintain exact FlowObj struct, map values if needed or assume processing format handles it.
        # processing outputs 'first_seen'/'timestamp' loosely natively mapped. The FastApi Pydantic
        # model expects timestamp. Let's remap slightly to ensure compatibility with FlowObj.
        mapped_flows = []
        for f in flows[:limit]:
            mapped_flows.append({
                "timestamp": f.get("last_seen", ""),
                "src_ip": f.get("src_ip", ""),
                "dst_ip": f.get("dst_ip", ""),
                "src_port": f.get("src_port", 0),
                "dst_port": f.get("dst_port", 0),
                "protocol": f.get("protocol", ""),
                "app": f.get("app", "unknown"),
                "sni": f.get("sni"),
                "bytes": f.get("bytes", 0),
                "blocked": f.get("blocked", False),
                "flow_id": f.get("flow_id", "")
            })
        return mapped_flows
    except Exception as e:
        logger.error(f"Redis get_active_flows error: {e}")
        return None

async def get_flow(flow_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a single flow record."""
    try:
        data = await redis_client.get(f"flow:{flow_id}")
        if data:
            f = json.loads(data)
            return {
                "timestamp": f.get("last_seen", ""),
                "src_ip": f.get("src_ip", ""),
                "dst_ip": f.get("dst_ip", ""),
                "src_port": f.get("src_port", 0),
                "dst_port": f.get("dst_port", 0),
                "protocol": f.get("protocol", ""),
                "app": f.get("app", "unknown"),
                "sni": f.get("sni"),
                "bytes": f.get("bytes", 0),
                "blocked": f.get("blocked", False),
                "flow_id": f.get("flow_id", "")
            }
    except Exception as e:
        logger.error(f"Redis get_flow error: {e}")
    return None

async def get_cached_stats() -> Optional[Dict[str, Any]]:
    try:
        data = await redis_client.get("cache:stats")
        if data:
            return json.loads(data)
    except Exception as e:
        logger.error(f"Redis get_cached_stats error: {e}")
    return None

async def set_cached_stats(stats: Dict[str, Any]) -> None:
    try:
        await redis_client.set("cache:stats", json.dumps(stats), ex=5)
    except Exception as e:
        logger.error(f"Redis set_cached_stats error: {e}")
