from sqlalchemy import Column, String, Float, Integer, Text, JSON
from app.db.session import Base

class Speaker(Base):
    __tablename__ = "speakers"

    id = Column(String, primary_key=True)
    manufacturer = Column(String, nullable=False)
    model = Column(String, nullable=False)
    type = Column(String, nullable=False)
    sensitivity = Column(Float)
    frequency_response = Column(JSON)
    directivity = Column(JSON)
    image_url = Column(String)
