"""Small first-party bearer-token auth layer.

Tokens deliberately identify a user, not an individual browser, so an MCP agent
acting with the user's token sees the same saved configurations.
"""

import base64
import hashlib
import hmac
import json
import secrets
import time
import httpx
import jwt

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User

bearer = HTTPBearer(auto_error=False)


def hash_password(password: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 310_000)
    return f"{salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    salt, _ = stored.split("$", 1)
    return hmac.compare_digest(hash_password(password, salt), stored)


def issue_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": int(time.time()) + settings.AUTH_TOKEN_TTL_SECONDS}
    encoded = (
        base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode())
        .decode()
        .rstrip("=")
    )
    signature = hmac.new(
        settings.AUTH_SECRET.encode(), encoded.encode(), hashlib.sha256
    ).hexdigest()
    return f"{encoded}.{signature}"


async def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Sign in is required")
    if settings.NEON_AUTH_JWKS_URL:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(settings.NEON_AUTH_JWKS_URL)
                response.raise_for_status()
            token_header = jwt.get_unverified_header(credentials.credentials)
            jwk = next(key for key in response.json()["keys"] if key["kid"] == token_header["kid"])
            options = {"verify_aud": bool(settings.NEON_AUTH_AUDIENCE)}
            payload = jwt.decode(credentials.credentials, jwt.algorithms.RSAAlgorithm.from_jwk(jwk), algorithms=[token_header.get("alg", "RS256")], issuer=settings.NEON_AUTH_ISSUER, audience=settings.NEON_AUTH_AUDIENCE, options=options)
            subject = str(payload["sub"])
            email = str(payload.get("email") or f"{subject}@neon-auth.local")
            user = (await db.execute(select(User).where(User.id == subject))).scalar_one_or_none()
            if not user:
                user = User(id=subject, email=email, password_hash="neon-auth-managed")
                db.add(user)
                await db.commit()
                await db.refresh(user)
            return user
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid Neon Auth session") from None
    try:
        encoded, signature = credentials.credentials.split(".", 1)
        expected = hmac.new(
            settings.AUTH_SECRET.encode(), encoded.encode(), hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError
        payload = json.loads(base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)))
        if payload["exp"] < time.time():
            raise ValueError
    except (ValueError, KeyError, json.JSONDecodeError):
        raise HTTPException(status_code=401, detail="Invalid or expired session") from None
    user = (await db.execute(select(User).where(User.id == payload["sub"]))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid session")
    return user
