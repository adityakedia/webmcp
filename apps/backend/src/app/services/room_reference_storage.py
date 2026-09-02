"""Temporary, agent-readable storage for user-approved Listening Lab room images."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

from app.core.config import settings


def store_room_reference_image(contents: bytes, filename: str, content_type: str) -> dict:
    if len(contents) > settings.ROOM_REFERENCE_MAX_BYTES:
        raise ValueError("Room image exceeds the configured size limit")

    asset_id = str(uuid4())
    extension = Path(filename).suffix.lower() or ".jpg"
    key = f"room-references/{asset_id}{extension}"
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=settings.ROOM_REFERENCE_TTL_SECONDS)

    if settings.NEON_OBJECT_STORAGE_ENDPOINT and settings.NEON_OBJECT_STORAGE_BUCKET:
        import boto3

        client = boto3.client(
            "s3", endpoint_url=settings.NEON_OBJECT_STORAGE_ENDPOINT,
            aws_access_key_id=settings.NEON_OBJECT_STORAGE_ACCESS_KEY_ID,
            aws_secret_access_key=settings.NEON_OBJECT_STORAGE_SECRET_ACCESS_KEY,
        )
        client.put_object(Bucket=settings.NEON_OBJECT_STORAGE_BUCKET, Key=key, Body=contents, ContentType=content_type)
        url = client.generate_presigned_url(
            "get_object", Params={"Bucket": settings.NEON_OBJECT_STORAGE_BUCKET, "Key": key}, ExpiresIn=settings.ROOM_REFERENCE_TTL_SECONDS,
        )
    else:
        directory = Path(settings.UPLOAD_DIR) / "room-references"
        directory.mkdir(parents=True, exist_ok=True)
        local_name = f"{asset_id}{extension}"
        (directory / local_name).write_bytes(contents)
        url = f"/static/room-references/{local_name}"

    return {"id": asset_id, "imageUrl": url, "fileName": filename, "mimeType": content_type, "expiresAt": expires_at.isoformat(), "bytes": len(contents)}
