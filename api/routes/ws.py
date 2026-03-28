"""
WebSocket endpoint for real-time dashboard updates.

Streams the latest stats, flows, and domains to connected clients.
If output.json exists, reads it and streams the current state.
If falling back to mock data, simulated traffic increments are applied 
so that charts and tables animate realistically.
"""

import asyncio
import random
import logging
from copy import deepcopy
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from data_loader import load_stats, load_flows, load_domains
from routes.stats import MOCK_STATS
from routes.flows import MOCK_FLOWS
from routes.sni import MOCK_DOMAINS

router = APIRouter()
logger = logging.getLogger("packetpulse.ws")

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"Error sending to websocket: {e}")
                self.disconnect(connection)

manager = ConnectionManager()

# Global state for mock live simulation
_simulated_stats = deepcopy(MOCK_STATS.dict())
_simulated_flows = [deepcopy(f.dict()) for f in MOCK_FLOWS]
_simulated_domains = [deepcopy(d.dict()) for d in MOCK_DOMAINS]

def _simulate_live_traffic():
    """Adds small random increments to the mock data to animate the frontend."""
    # Stats increment
    p_inc = random.randint(10, 250)
    b_inc = p_inc * random.randint(300, 1500)
    
    _simulated_stats["total_packets"] += p_inc
    _simulated_stats["total_bytes"] += b_inc
    _simulated_stats["packets_per_sec"] = round((p_inc * 1.0) / 1.0, 1) # ~1s interval
    
    # Protocols breakdown
    tcp_inc = int(p_inc * 0.8)
    udp_inc = int(p_inc * 0.15)
    _simulated_stats["protocols"]["tcp"] += tcp_inc
    _simulated_stats["protocols"]["udp"] += udp_inc
    _simulated_stats["protocols"]["other"] += (p_inc - tcp_inc - udp_inc)
    
    # Simulate a flow update (e.g., YouTube connection active)
    _simulated_flows[0]["packets"] += tcp_inc
    _simulated_flows[0]["bytes"] += (b_inc // 2)

    # Occasionally toggle a blocked flow or active flows count
    if random.random() < 0.2:
        _simulated_stats["blocked_packets"] += 1
        _simulated_flows[1]["packets"] += 1
        _simulated_flows[1]["bytes"] += 64

    # Keep capture duration ticking
    _simulated_stats["capture_duration_sec"] = round(_simulated_stats["capture_duration_sec"] + 1.0, 1)


@router.websocket("/live")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket streaming endpoint. Connect via ws://localhost:8000/ws/live
    Emits data every 1 second.
    """
    await manager.connect(websocket)
    try:
        while True:
            # Check if real data is available
            real_stats = load_stats()
            real_flows = load_flows()
            real_domains = load_domains()

            data_package = {}

            if real_stats and real_flows and real_domains:
                # Use real engine output
                data_package = {
                    "source": "real",
                    "stats": real_stats,
                    "flows": real_flows,
                    "domains": real_domains
                }
            else:
                # Use simulated mock data to show dynamic behavior
                _simulate_live_traffic()
                data_package = {
                    "source": "simulated",
                    "stats": _simulated_stats,
                    "flows": _simulated_flows,
                    "domains": _simulated_domains
                }

            # Send payload to client
            await websocket.send_json(data_package)
            await asyncio.sleep(1.0)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except asyncio.CancelledError:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)
