from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

import backend.app.services.auth_service as auth_service
import backend.app.services.user_service as user_service
from backend.app.core.constants import SUPERADMIN_ROLE
from backend.app.core.database import get_db
from backend.app.models.user import User
from backend.app.schemas.user import (
    TokenResponse,
    UserCreate,
    UserLogin,
    UserMiniResponse,
    UserResponse,
)


router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await auth_service.login_user(
        db,
        credentials.username,
        credentials.password
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_obj = await user_service.get_user_by_username(db, credentials.username)

    business_id = user_obj.business.id if user_obj.business else None

    return {
        "access_token": result,
        "token_type": "bearer",
        "user": {
            **UserMiniResponse.model_validate(user_obj).model_dump(),
            "business_id": business_id
        }
    }


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    # Admin-only registration: require an authenticated admin user
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Registration is restricted to admins; use /api/auth/admin/register with an admin token or run the seed script to create the first admin.")


@router.get("/me", response_model=UserResponse)
async def read_current_user(
    current_user: User = Depends(auth_service.get_authenticated_user),
):
    return current_user


@router.post("/admin/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_admin(
    user: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.get_authenticated_user),
):
    # Only an existing superadmin may create another admin user
    if current_user.role != SUPERADMIN_ROLE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    # force role to admin for this endpoint
    user.role = "admin"

    return await user_service.create_user(db, user)


@router.post("/logout")
async def logout(
    current_user = Depends(auth_service.get_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    await auth_service.logout_user(db, current_user)

    return {
        "message": "Successfully logged out"
    }