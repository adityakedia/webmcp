"""Authenticated, revisioned custom-speaker configurations.

The JSON payload remains the public `CustomSpeakerConfiguration` contract.  A
revision is appended on every save so the user and their MCP agent can safely
continue work from the same durable draft and recover an earlier iteration.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import current_user
from app.db.session import get_db
from app.models.custom_speaker_configuration import (
    CustomSpeakerConfigurationRecord,
    CustomSpeakerConfigurationRevision,
)
from app.models.user import User
from app.schemas.custom_speaker import CustomSpeakerConfiguration

router = APIRouter()


class SaveConfiguration(BaseModel):
    configuration: CustomSpeakerConfiguration
    expected_revision: int | None = None
    actor: str = "user"


def serialize(record: CustomSpeakerConfigurationRecord) -> dict:
    return {
        "id": record.id,
        "name": record.name,
        "configuration": {**record.configuration, "id": record.id},
        "revision": record.revision,
        "createdAt": record.created_at,
        "updatedAt": record.updated_at,
    }


async def owned(
    configuration_id: str, user: User, db: AsyncSession
) -> CustomSpeakerConfigurationRecord:
    record = (
        await db.execute(
            select(CustomSpeakerConfigurationRecord).where(
                CustomSpeakerConfigurationRecord.id == configuration_id,
                CustomSpeakerConfigurationRecord.owner_id == user.id,
            )
        )
    ).scalar_one_or_none()
    if not record:
        raise HTTPException(404, "Configuration not found")
    return record


@router.get("/")
async def list_configurations(
    user: User = Depends(current_user), db: AsyncSession = Depends(get_db)
):
    records = (
        (
            await db.execute(
                select(CustomSpeakerConfigurationRecord)
                .where(CustomSpeakerConfigurationRecord.owner_id == user.id)
                .order_by(CustomSpeakerConfigurationRecord.updated_at.desc())
            )
        )
        .scalars()
        .all()
    )
    return {"configurations": [serialize(record) for record in records]}


@router.post("/", status_code=201)
async def create_configuration(
    body: SaveConfiguration, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)
):
    payload = body.configuration.model_dump(by_alias=True)
    payload.pop("id", None)
    record = CustomSpeakerConfigurationRecord(
        owner_id=user.id, name=body.configuration.name, configuration=payload
    )
    db.add(record)
    await db.flush()
    db.add(
        CustomSpeakerConfigurationRevision(
            configuration_id=record.id, revision=1, configuration=payload, actor=body.actor
        )
    )
    await db.commit()
    await db.refresh(record)
    return serialize(record)


@router.get("/{configuration_id}")
async def get_configuration(
    configuration_id: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)
):
    return serialize(await owned(configuration_id, user, db))


@router.put("/{configuration_id}")
async def update_configuration(
    configuration_id: str,
    body: SaveConfiguration,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    record = await owned(configuration_id, user, db)
    if body.expected_revision is not None and body.expected_revision != record.revision:
        raise HTTPException(
            409, {"message": "Configuration changed elsewhere", "currentRevision": record.revision}
        )
    payload = body.configuration.model_dump(by_alias=True)
    payload.pop("id", None)
    record.configuration = payload
    record.name = body.configuration.name
    record.revision += 1
    db.add(
        CustomSpeakerConfigurationRevision(
            configuration_id=record.id,
            revision=record.revision,
            configuration=payload,
            actor=body.actor,
        )
    )
    await db.commit()
    await db.refresh(record)
    return serialize(record)


@router.get("/{configuration_id}/revisions")
async def revisions(
    configuration_id: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)
):
    await owned(configuration_id, user, db)
    rows = (
        (
            await db.execute(
                select(CustomSpeakerConfigurationRevision)
                .where(CustomSpeakerConfigurationRevision.configuration_id == configuration_id)
                .order_by(CustomSpeakerConfigurationRevision.revision.desc())
            )
        )
        .scalars()
        .all()
    )
    return {
        "revisions": [
            {
                "revision": row.revision,
                "configuration": {**row.configuration, "id": configuration_id},
                "actor": row.actor,
                "createdAt": row.created_at,
            }
            for row in rows
        ]
    }
