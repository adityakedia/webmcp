import os
from pydantic import field_validator
from pydantic_settings import BaseSettings
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://acoustom:acoustom@localhost:5432/acoustom"
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    UPLOAD_DIR: str = "/tmp/acoustom-uploads"
    SIMULATION_TIMEOUT: int = 300
    AUTH_SECRET: str = "change-this-in-production"
    AUTH_TOKEN_TTL_SECONDS: int = 60 * 60 * 24 * 30
    NEON_AUTH_JWKS_URL: str | None = None
    NEON_AUTH_ISSUER: str | None = None
    NEON_AUTH_AUDIENCE: str | None = None
    SIMULATION_AUDIO_TTL_SECONDS: int = 60 * 60
    SIMULATION_AUDIO_MAX_BYTES: int = 50 * 1024 * 1024
    ROOM_REFERENCE_TTL_SECONDS: int = 60 * 60
    ROOM_REFERENCE_MAX_BYTES: int = 12 * 1024 * 1024
    NEON_OBJECT_STORAGE_ENDPOINT: str | None = None
    NEON_OBJECT_STORAGE_BUCKET: str | None = None
    NEON_OBJECT_STORAGE_ACCESS_KEY_ID: str | None = None
    NEON_OBJECT_STORAGE_SECRET_ACCESS_KEY: str | None = None

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def use_async_postgres_driver(cls, value: str) -> str:
        """Accept Neon’s copied URL and convert it for SQLAlchemy asyncio."""
        value = value.replace("postgresql+psycopg2://", "postgresql+asyncpg://", 1).replace(
            "postgresql://", "postgresql+asyncpg://", 1
        )
        parts = urlsplit(value)
        query = [(key, val) for key, val in parse_qsl(parts.query) if key != "channel_binding"]
        query = [("ssl", "require") if key == "sslmode" and val == "require" else (key, val) for key, val in query]
        return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))

    class Config:
        env_file = ".env"

settings = Settings()
