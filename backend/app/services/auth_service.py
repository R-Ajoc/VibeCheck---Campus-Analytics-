import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from backend.app.core.database import get_db
from backend.app.core.security import generate_access_token, verify_password
from backend.app.models.user import User
from backend.app.services.user_service import get_user_by_username

logger = logging.getLogger(__name__)

oauth2_scheme = HTTPBearer() # Using HTTP Bearer tokens for authentication

async def authenticate_user(db, username, password):
    user = await get_user_by_username(db, username)

    if not user or not verify_password(password, user.hashed_password):
        return None

    return user


async def login_user(db: AsyncSession, username: str, password: str):
    user = await authenticate_user(db, username, password)

    if not user:
        return None

    token = generate_access_token()

    user.token = token
    await db.commit()
    await db.refresh(user)

    return token


async def get_authenticated_user(
    credentials: HTTPAuthorizationCredentials = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:

    token = credentials.credentials

    result = await db.execute(
        select(User).options(selectinload(User.business)).where(User.token == token)
    )

    user = result.scalars().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    return user


async def logout_user(db: AsyncSession, user: User) -> None:
    user.token = None
    await db.commit()