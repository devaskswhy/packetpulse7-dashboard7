from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict
from data_loader import data_manager
from redis_client import get_cached_stats, set_cached_stats
from db.session import AsyncSessionLocal
from db.crud import get_stats_history
from typing import Dict, List, Any

router = APIRouter()

class StatsResponse(BaseModel):
    total_packets: int
    total_bytes: int
    blocked_count: int
    top_apps: Dict[str, int]

@router.get("", response_model=StatsResponse)
async def get_stats():
    cached = await get_cached_stats()
    if cached:
        return cached

    data = data_manager.get_data()
    stats = data.get("stats", {})
    
    # Store to cache for future requests
    if stats:
        await set_cached_stats(stats)
        
    return stats

@router.get("/history")
async def get_history(hours: int = 24):
    async with AsyncSessionLocal() as session:
        history = await get_stats_history(session, hours)
        
        # Format for response
        return [
            {
                "hour": row.hour.isoformat() + "Z",
                "avg_packets": float(row.avg_packets),
                "avg_bytes": float(row.avg_bytes),
                "avg_blocked": float(row.avg_blocked)
            }
            for row in history
        ]

