from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from data_loader import data_manager
from redis_client import get_active_flows, get_flow

router = APIRouter()

class FlowObj(BaseModel):
    timestamp: str
    src_ip: str
    dst_ip: str
    src_port: int
    dst_port: int
    protocol: str
    app: str
    sni: Optional[str] = None
    bytes: int
    blocked: bool
    flow_id: str

class FlowsResponse(BaseModel):
    total: int
    page: int
    limit: int
    flows: List[FlowObj]

@router.get("", response_model=FlowsResponse)
async def get_flows(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=500, description="Items per page"),
):
    # Try Redis first
    active_flows = await get_active_flows(limit=1000)
    
    if active_flows is not None:
        all_flows = active_flows
    else:
        # Fallback to in-memory deque
        data = data_manager.get_data()
        all_flows = data.get("flows", [])
    
    start = (page - 1) * limit
    end = start + limit
    paginated = all_flows[start:end]

    return FlowsResponse(
        total=len(all_flows),
        page=page,
        limit=limit,
        flows=paginated
    )

@router.get("/{flow_id}", response_model=FlowObj)
async def get_single_flow(flow_id: str):
    flow_record = await get_flow(flow_id)
    if flow_record:
        return flow_record
        
    # Fallback to scanning deque
    data = data_manager.get_data()
    flows = data.get("flows", [])
    for f in flows:
        if f.get("flow_id") == flow_id:
            return f
            
    raise HTTPException(status_code=404, detail="Flow not found")
