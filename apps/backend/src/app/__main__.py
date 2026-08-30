import asyncio
import os
from uvicorn import Config, Server

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))

if __name__ == "__main__":
    config = Config("app.main:app", host=HOST, port=PORT, reload=True)
    server = Server(config)
    asyncio.run(server.serve())
