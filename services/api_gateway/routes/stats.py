from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict
from data_loader import data_manager
from redis_client import get_cached_stats, set_cached_stats

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
