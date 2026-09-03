from sqlalchemy import Column, String, JSON
from app.db.session import Base


class Speaker(Base):
    __tablename__ = "speakers"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    price = Column(String, nullable=False)
    image = Column(String, nullable=False)
    tone = Column(String, nullable=False)
    category = Column(String, nullable=False)
    description = Column(String, nullable=False)
    specs = Column(JSON, nullable=False)
