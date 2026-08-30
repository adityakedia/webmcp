import os

from fastapi import FastAPI, staticfiles
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import router
from app.core.config import settings

app = FastAPI(title="Acoustom API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=settings.CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])
app.include_router(router)

@app.get("/health")
async def health():
    return {"status": "ok"}

# Serve generated RIR files
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/static", staticfiles.StaticFiles(directory=settings.UPLOAD_DIR), name="static")
