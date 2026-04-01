"""
WebSocket endpoint: ws://host/ws/live

Uses the shared ConnectionManager. The data_loader pushes events via broadcast:
  - { "type": "stats", "data": {...} }       — every ~2s
  - { "type": "alert", "data": {...} }       — immediately on new alert
  - { "type": "flows_update", "count": N }   — on new flow flush

This endpoint simply keeps the connection alive and handles connect/disconnect.
Clients receive broadcasts from the data_loader loop.
"""

import asyncio
import logging
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from connection_manager import ws_manager
from redis_client import redis_client

router = APIRouter()
logger = logging.getLogger("api_gateway")


@router.websocket("/live")
async def websocket_endpoint(websocket: WebSocket, api_key: str = Query(None)):
    """
    WebSocket streaming endpoint.
    Connect via ws://localhost:8000/ws/live
    No auth required on WS (API key is for REST only).
    """
    if not api_key:
        await websocket.close(code=4001)
        return

    try:
        is_valid = await redis_client.sismember("api:keys", api_key)
    except Exception:
        await websocket.close(code=1011)
        return

    if not is_valid:
        await websocket.close(code=4001)
        return

    await ws_manager.connect(websocket)
    try:
        # Keep connection alive — listen for client pings / close frames.
        # All data is pushed by data_loader via ws_manager.broadcast().
        while True:
            # Wait for client messages (ping/pong, or close).
            # If the client disconnects, this raises WebSocketDisconnect.
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except asyncio.CancelledError:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)
