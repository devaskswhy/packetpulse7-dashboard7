from data_loader import data_manager
from db.session import AsyncSessionLocal
from sqlalchemy import select
from db.models import Alert
from fastapi import Query
import datetime

router = APIRouter()

class AlertObj(BaseModel):
    type: str # "blocked" or "anomaly"
    ip: str
    reason: str
    ts: str

@router.get("", response_model=List[AlertObj])
async def get_alerts(
    limit: int = Query(50, ge=1, le=500),
    severity: Optional[str] = None
):
    async with AsyncSessionLocal() as session:
        query = select(Alert).order_by(Alert.ts.desc()).limit(limit)
        if severity:
            query = query.where(Alert.severity == severity)
            
        result = await session.execute(query)
        db_alerts = result.scalars().all()
        
        return [
            {
                "type": a.type,
                "ip": a.src_ip if a.src_ip else "N/A",
                "reason": a.reason,
                "ts": a.ts.isoformat() + "Z"
            }
            for a in db_alerts
        ]

