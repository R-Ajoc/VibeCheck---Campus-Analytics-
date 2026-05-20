from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.constants import DEFAULT_USER_ROLE
from backend.app.models.user import User
from backend.app.schemas.user import UserCreate, UserUpdate
from backend.app.core.security import hash_password
from sqlalchemy.orm import selectinload


async def create_user(db: AsyncSession, user: UserCreate) -> User:
    # Check for duplicate username
    result = await db.execute(
        select(User).where(User.username == user.username)
    )
    existing_user = result.scalars().first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists",
        )

    new_user = User(
        username=user.username,
        firstname=user.firstname,
        lastname=user.lastname,
        role=user.role or DEFAULT_USER_ROLE,
        hashed_password=hash_password(user.password),
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return new_user


async def get_user_or_404(db: AsyncSession, user_id: int) -> User:
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalars().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user


async def get_user_by_username(db: AsyncSession, username: str) -> User | None:
    result = await db.execute(
        select(User)
        .options(selectinload(User.business))
        .where(User.username == username)
    )
    return result.scalars().first()


async def get_user_by_token(db: AsyncSession, token: str) -> User | None:
    result = await db.execute(
        select(User).where(User.token == token)
    )
    return result.scalars().first()


async def get_users(db: AsyncSession) -> list[User]:
    result = await db.execute(select(User))
    return result.scalars().all()


async def update_user(
    db: AsyncSession,
    user_id: int,
    updated_user: UserUpdate
) -> User:

    user = await get_user_or_404(db, user_id)

    update_data = updated_user.model_dump(exclude_unset=True)

    # username uniqueness check
    if "username" in update_data and update_data["username"] != user.username:
        result = await db.execute(
            select(User).where(User.username == update_data["username"])
        )
        existing_user = result.scalars().first()

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists",
            )

    # password hashing if updated
    if "password" in update_data:
        update_data["hashed_password"] = hash_password(update_data.pop("password"))

    # apply updates
    for field, value in update_data.items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)

    return user


async def delete_user(db: AsyncSession, user_id: int) -> bool:
    user = await get_user_or_404(db, user_id)

    await db.delete(user)
    await db.commit()
    return True