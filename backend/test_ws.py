import asyncio
import websockets

async def test_ws():
    uri = "ws://127.0.0.1:8000/ws/chat/1?token=invalid"
    try:
        async with websockets.connect(uri) as ws:
            print("Connected!")
            await ws.send('{"content": "hello", "is_anonymous": false}')
            msg = await ws.recv()
            print("Received:", msg)
    except Exception as e:
        print("Failed to connect:", e)

if __name__ == "__main__":
    asyncio.run(test_ws())
