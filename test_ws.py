import asyncio
import websockets

async def hello():
    try:
        async with websockets.connect('ws://localhost:8000/ws/live') as websocket:
            print("Connected!")
            res = await websocket.recv()
            print("Received:", res)
    except Exception as e:
        print("Error:", e)

asyncio.run(hello())
