from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from data_loader import data_manager
from redis_client import get_active_flows, get_flow
import datetime
from db.session import AsyncSessionLocal
from db.crud import get_flows as db_get_flows

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
    src_ip: Optional[str] = None,
    app: Optional[str] = None,
    start_time: Optional[datetime.datetime] = None,
    end_time: Optional[datetime.datetime] = None
):
    # If filters are present, use DB
    if any([src_ip, app, start_time, end_time]) or page > 1:
        async with AsyncSessionLocal() as session:
            filters = {
                "src_ip": src_ip,
                "app": app,
                "start_time": start_time,
                "end_time": end_time
            }
            db_flows = await db_get_flows(session, page, limit, filters)
            
            # Map DB objects to Pydantic Response model
            flows_out = []
            for f in db_flows:
                flows_out.append({
                    "timestamp": f.last_seen.isoformat() + "Z",
                    "src_ip": f.src_ip,
                    "dst_ip": f.dst_ip,
                    "src_port": f.src_port,
                    "dst_port": f.dst_port,
                    "protocol": f.protocol,
                    "app": f.app,
                    "sni": f.sni,
                    "bytes": f.bytes,
                    "blocked": f.blocked,
                    "flow_id": f.flow_id
                })
            
            return FlowsResponse(
                total=len(flows_out), # We don't have total count yet, we should probably add it
                page=page,
                limit=limit,
                flows=flows_out
            )

    # Try Redis first for "live" recent view
    active_flows = await get_active_flows(limit=100)
    
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
