"""Temporary storage for browser-rendered simulation audio.

Uses Neon Object Storage's S3-compatible API when configured. Local files are
kept as a development fallback so the frontend workflow remains runnable.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

from app.core.config import settings


def store_simulated_audio(contents: bytes, filename: str) -> dict:
    if len(contents) > settings.SIMULATION_AUDIO_MAX_BYTES:
        raise ValueError("Rendered audio exceeds the configured size limit")
    asset_id = str(uuid4())
    key = f"simulation-audio/{asset_id}.wav"
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=settings.SIMULATION_AUDIO_TTL_SECONDS)
    if settings.NEON_OBJECT_STORAGE_ENDPOINT and settings.NEON_OBJECT_STORAGE_BUCKET:
        import boto3

        client = boto3.client(
            "s3", endpoint_url=settings.NEON_OBJECT_STORAGE_ENDPOINT,
            aws_access_key_id=settings.NEON_OBJECT_STORAGE_ACCESS_KEY_ID,
            aws_secret_access_key=settings.NEON_OBJECT_STORAGE_SECRET_ACCESS_KEY,
        )
        client.put_object(Bucket=settings.NEON_OBJECT_STORAGE_BUCKET, Key=key, Body=contents, ContentType="audio/wav")
        url = client.generate_presigned_url("get_object", Params={"Bucket": settings.NEON_OBJECT_STORAGE_BUCKET, "Key": key}, ExpiresIn=settings.SIMULATION_AUDIO_TTL_SECONDS)
    else:
        directory = Path(settings.UPLOAD_DIR) / "simulation-audio"; directory.mkdir(parents=True, exist_ok=True)
        local_name = f"{asset_id}-{filename.removesuffix('.wav')}.wav"
        (directory / local_name).write_bytes(contents)
        url = f"/static/simulation-audio/{local_name}"
    return {"assetId": asset_id, "audioUrl": url, "mimeType": "audio/wav", "expiresAt": expires_at.isoformat(), "bytes": len(contents)}
