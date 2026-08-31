from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import current_user, hash_password, issue_token, verify_password
from app.db.session import get_db
from app.models.user import User

router = APIRouter()


class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=320, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=10, max_length=256)


def response(user: User) -> dict:
    return {"accessToken": issue_token(user.id), "user": {"id": user.id, "email": user.email}}


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: Credentials, db: AsyncSession = Depends(get_db)):
    email = body.email.lower()
    if (await db.execute(select(User).where(User.email == email))).scalar_one_or_none():
        raise HTTPException(409, "An account with this email already exists")
    user = User(email=email, password_hash=hash_password(body.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return response(user)


@router.post("/login")
async def login(body: Credentials, db: AsyncSession = Depends(get_db)):
    user = (
        await db.execute(select(User).where(User.email == body.email.lower()))
    ).scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    return response(user)


@router.get("/me")
async def me(user: User = Depends(current_user)):
    return {"id": user.id, "email": user.email}
