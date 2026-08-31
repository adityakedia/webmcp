import uuid

from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String, func

from app.db.session import Base


class CustomSpeakerConfigurationRecord(Base):
    __tablename__ = "custom_speaker_configurations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id = Column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name = Column(String, nullable=False)
    configuration = Column(JSON, nullable=False)
    revision = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class CustomSpeakerConfigurationRevision(Base):
    __tablename__ = "custom_speaker_configuration_revisions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    configuration_id = Column(
        String,
        ForeignKey("custom_speaker_configurations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    revision = Column(Integer, nullable=False)
    configuration = Column(JSON, nullable=False)
    actor = Column(String, nullable=False)  # "user" or "agent"
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
