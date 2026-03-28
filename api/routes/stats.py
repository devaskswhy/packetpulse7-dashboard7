"""
GET /stats — Packet capture statistics.

Reads from the C++ engine's output.json when available,
otherwise serves built-in mock data so the API is always usable.
"""

from fastapi import APIRouter

from models.stats import StatsResponse, PacketStats, ProtocolBreakdown
from data_loader import load_stats

router = APIRouter()

# ---------------------------------------------------------------------------
# Fallback mock data (used when output.json is absent)
# ---------------------------------------------------------------------------
MOCK_STATS = PacketStats(
    total_packets=584_213,
    total_bytes=437_812_480,
    active_flows=142,
    blocked_packets=3_871,
    protocols=ProtocolBreakdown(tcp=491_740, udp=88_902, other=3_571),
    capture_duration_sec=3_612.7,
    packets_per_sec=161.7,
)


@router.get(
    "",
    response_model=StatsResponse,
    summary="Packet capture summary",
    description="Returns aggregate packet statistics from the DPI engine.",
)
async def get_stats():
    real = load_stats()
    if real is not None:
        stats = PacketStats(
            total_packets=real["total_packets"],
            total_bytes=real["total_bytes"],
            active_flows=real["active_flows"],
            blocked_packets=real["blocked_packets"],
            protocols=ProtocolBreakdown(**real["protocols"]),
            capture_duration_sec=real["capture_duration_sec"],
            packets_per_sec=real["packets_per_sec"],
        )
        return StatsResponse(stats=stats)

    return StatsResponse(stats=MOCK_STATS)
