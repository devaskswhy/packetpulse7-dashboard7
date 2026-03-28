"""
GET /sni — Extracted domains (TLS SNI / HTTP Host / DNS).

Reads from the C++ engine's output.json when available,
otherwise serves built-in mock data so the API is always usable.
"""

from fastapi import APIRouter, Query

from models.sni import SNIResponse, DomainEntry
from data_loader import load_domains

router = APIRouter()

# ---------------------------------------------------------------------------
# Fallback mock data (used when output.json is absent)
# ---------------------------------------------------------------------------
MOCK_DOMAINS: list[DomainEntry] = [
    DomainEntry(domain="www.youtube.com", app="YouTube", flow_count=18,
                total_bytes=24_117_248, blocked=False),
    DomainEntry(domain="*.facebook.com", app="Facebook", flow_count=7,
                total_bytes=1_572_864, blocked=True),
    DomainEntry(domain="www.reddit.com", app="Reddit", flow_count=4,
                total_bytes=524_288, blocked=False),
    DomainEntry(domain="dns.google", app="DNS", flow_count=42,
                total_bytes=53_760, blocked=False),
    DomainEntry(domain="*.tiktok.com", app="TikTok", flow_count=12,
                total_bytes=8_912_896, blocked=True),
    DomainEntry(domain="s3.amazonaws.com", app="AWS", flow_count=9,
                total_bytes=15_728_640, blocked=False),
    DomainEntry(domain="login.microsoftonline.com", app="Microsoft", flow_count=3,
                total_bytes=262_144, blocked=False),
    DomainEntry(domain="gateway.icloud.com", app="Apple", flow_count=5,
                total_bytes=786_432, blocked=False),
    DomainEntry(domain="*.netflix.com", app="Netflix", flow_count=14,
                total_bytes=41_943_040, blocked=False),
    DomainEntry(domain="api.twitter.com", app="Twitter/X", flow_count=6,
                total_bytes=1_048_576, blocked=False),
]


def _parse_domains(raw: list) -> list[DomainEntry]:
    """Convert raw JSON dicts from output.json into DomainEntry models."""
    result = []
    for d in raw:
        result.append(DomainEntry(
            domain=d["domain"],
            app=d.get("app", "Unknown"),
            flow_count=d.get("flow_count", 0),
            total_bytes=d.get("total_bytes", 0),
            blocked=d.get("blocked", False),
        ))
    return result


@router.get(
    "",
    response_model=SNIResponse,
    summary="Extracted domains",
    description="Returns domains extracted via TLS SNI, HTTP Host, and DNS inspection.",
)
async def get_sni(
    app: str | None = Query(None, description="Filter by application name"),
    blocked: bool | None = Query(None, description="Filter by blocked status"),
    limit: int = Query(50, ge=1, le=500, description="Max entries to return"),
):
    real = load_domains()
    results = _parse_domains(real) if real is not None else list(MOCK_DOMAINS)

    if app is not None:
        results = [d for d in results if d.app.lower() == app.lower()]
    if blocked is not None:
        results = [d for d in results if d.blocked is blocked]

    results = results[:limit]
    return SNIResponse(total=len(results), domains=results)
