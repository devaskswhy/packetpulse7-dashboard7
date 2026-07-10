"""
PacketPulse — Demo Replay API
------------------------------
Standalone, single-process FastAPI service that mimics the full
Kafka -> Processing -> Detection -> Postgres/Redis -> API Gateway
pipeline's HTTP/WebSocket surface, without needing any of that
infrastructure. Generates synthetic flows/alerts/stats in-memory
on a background loop, matching PacketPulse's real schemas exactly.

Deploy this alone on Render (free tier). Your existing React
dashboard talks to the same endpoints/WS events, so it needs
zero changes.
"""

import asyncio
import hashlib
import random
import time
import uuid
from collections import deque
from datetime import datetime, timezone

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="PacketPulse Demo API")

# Allow your Vercel frontend (and localhost for testing) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your Vercel URL once deployed if you want
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# In-memory "database" — replaces Postgres + Redis for the demo
# ---------------------------------------------------------------------------
FLOWS: dict[str, dict] = {}
ALERTS: deque = deque(maxlen=2000)
STATS_HISTORY: deque = deque(maxlen=500)

APPS = ["YouTube", "Netflix", "Zoom", "Spotify", "Slack", "GitHub", "Steam", "Discord", "WhatsApp", "Instagram"]
PROTOCOLS = ["TCP", "UDP"]
ALERT_TYPES = ["blocked_ip", "blocked_domain", "rate_limit", "anomaly"]
SEVERITIES = ["low", "medium", "high", "critical"]

connected_sockets: list[WebSocket] = []


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def rand_ip() -> str:
    return f"{random.randint(1,255)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}"


def make_flow() -> dict:
    src_ip, dst_ip = rand_ip(), rand_ip()
    src_port, dst_port = random.randint(1024, 65000), random.choice([443, 80, 8080, 22, 53])
    protocol = random.choice(PROTOCOLS)
    raw = f"{src_ip}{dst_ip}{src_port}{dst_port}{protocol}"
    flow_id = hashlib.sha256(raw.encode()).hexdigest()
    packets = random.randint(5, 2000)
    flow = {
        "flow_id": flow_id,
        "src_ip": src_ip,
        "dst_ip": dst_ip,
        "src_port": src_port,
        "dst_port": dst_port,
        "protocol": protocol,
        "app": random.choice(APPS),
        "bytes": packets * random.randint(64, 1500),
        "packets": packets,
        "first_seen": now_iso(),
        "last_seen": now_iso(),
        "duration_s": round(random.uniform(0.5, 30.0), 2),
        "blocked": random.random() < 0.05,
    }
    return flow


def make_alert(flow: dict) -> dict:
    alert_type = random.choice(ALERT_TYPES)
    
    reasons = {
        "blocked_ip": [
            "Source IP matches known malicious IP blocklist",
            "Repeated connection attempts from flagged IP",
            "IP flagged in threat intelligence feed"
        ],
        "blocked_domain": [
            "Destination domain matches blocked category (malware/phishing)",
            "DNS query resolved to blocklisted domain"
        ],
        "rate_limit": [
            f"Traffic rate exceeded {random.randint(800, 2500)} packets/sec threshold",
            "Unusual burst in connection rate detected"
        ],
        "anomaly": [
            "Unusual port/protocol combination detected",
            "Traffic pattern deviates from baseline behavior",
            "Unexpected data volume for this flow signature"
        ]
    }
    
    return {
        "alert_id": str(uuid.uuid4()),
        "type": alert_type,
        "severity": random.choice(SEVERITIES),
        "flow_id": flow["flow_id"],
        "src_ip": flow["src_ip"],
        "dst_ip": flow["dst_ip"],
        "reason": random.choice(reasons[alert_type]),
        "ts": now_iso(),
    }


def current_stats() -> dict:
    total_bytes = sum(f["bytes"] for f in FLOWS.values())
    total_packets = sum(f["packets"] for f in FLOWS.values())
    blocked = sum(1 for f in FLOWS.values() if f["blocked"])
    top_apps: dict[str, int] = {}
    for f in FLOWS.values():
        top_apps[f["app"]] = top_apps.get(f["app"], 0) + f["bytes"]
    return {
        "ts": now_iso(),
        "total_packets": total_packets,
        "total_bytes": total_bytes,
        "blocked_count": blocked,
        "top_apps": dict(sorted(top_apps.items(), key=lambda x: -x[1])[:5]),
    }


# ---------------------------------------------------------------------------
# Background generator loop — replaces the Kafka pipeline
# ---------------------------------------------------------------------------
async def generator_loop():
    tick = 0
    while True:
        await asyncio.sleep(2)
        tick += 1

        # add a batch of new flows
        new_flows = [make_flow() for _ in range(random.randint(2, 6))]
        for f in new_flows:
            FLOWS[f["flow_id"]] = f
        if len(FLOWS) > 5000:
            for k in list(FLOWS.keys())[: len(FLOWS) - 5000]:
                del FLOWS[k]

        await broadcast({"type": "flows_update", "count": len(new_flows)})

        # occasionally raise an alert
        if random.random() < 0.35:
            alert = make_alert(random.choice(new_flows))
            ALERTS.appendleft(alert)
            await broadcast({"type": "alert", "data": alert})

        # push stats every tick (~2s)
        stats = current_stats()
        STATS_HISTORY.appendleft(stats)
        await broadcast({"type": "stats", "data": stats})


async def broadcast(message: dict):
    dead = []
    for ws in connected_sockets:
        try:
            await ws.send_json(message)
        except Exception:
            dead.append(ws)
    for ws in dead:
        connected_sockets.remove(ws)


@app.on_event("startup")
async def startup():
    # seed some initial flows so the dashboard isn't empty on first load
    for _ in range(50):
        f = make_flow()
        FLOWS[f["flow_id"]] = f
    for _ in range(10):
        ALERTS.appendleft(make_alert(random.choice(list(FLOWS.values()))))
    asyncio.create_task(generator_loop())


# ---------------------------------------------------------------------------
# REST endpoints — same paths/shapes as the real api_gateway
# ---------------------------------------------------------------------------
def paginate(items: list, page: int, limit: int) -> dict:
    total = len(items)
    start = (page - 1) * limit
    end = start + limit
    pages = max(1, (total + limit - 1) // limit)
    return {"data": items[start:end], "total": total, "page": page, "limit": limit, "pages": pages}


@app.get("/health")
async def health():
    return {"status": "ok", "mode": "active", "flows": len(FLOWS), "alerts": len(ALERTS)}


@app.get("/flows")
async def get_flows(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    src_ip: str | None = None,
    app_name: str | None = Query(None, alias="app"),
    blocked: bool | None = None,
):
    items = list(FLOWS.values())
    if src_ip:
        items = [f for f in items if f["src_ip"] == src_ip]
    if app_name:
        items = [f for f in items if f["app"] == app_name]
    if blocked is not None:
        items = [f for f in items if f["blocked"] == blocked]
    items.sort(key=lambda f: f["last_seen"], reverse=True)
    return paginate(items, page, limit)


@app.get("/flows/{flow_id}")
async def get_flow(flow_id: str):
    return FLOWS.get(flow_id, {})


@app.get("/stats")
async def get_stats():
    return current_stats()


@app.get("/stats/history")
async def get_stats_history():
    return list(STATS_HISTORY)


@app.get("/alerts")
async def get_alerts(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    severity: str | None = None,
    type: str | None = None,
):
    items = list(ALERTS)
    if severity:
        items = [a for a in items if a["severity"] == severity]
    if type:
        items = [a for a in items if a["type"] == type]
    return paginate(items, page, limit)


@app.get("/rules")
async def get_rules():
    return {"blocked_ips": [], "blocked_domains": [], "blocked_ports": [4444, 6667], "rate_limit_pps": 1000}


@app.post("/rules")
async def update_rules(rules: dict):
    return {"status": "updated", "rules": rules}


# ---------------------------------------------------------------------------
# WebSocket — same event shapes as the real gateway
# ---------------------------------------------------------------------------
@app.websocket("/ws/live")
async def ws_live(websocket: WebSocket):
    await websocket.accept()
    connected_sockets.append(websocket)
    try:
        await websocket.send_json({"type": "stats", "data": current_stats()})
        while True:
            await websocket.receive_text()  # keep connection alive; ignore client pings
    except WebSocketDisconnect:
        if websocket in connected_sockets:
            connected_sockets.remove(websocket)
