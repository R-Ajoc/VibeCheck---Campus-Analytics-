from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

from typing import Literal

class UserBase(BaseModel):
    username: str = Field(..., min_length=4,max_length=50)
    firstname: str | None = Field(None, max_length=20)
    lastname: str | None = Field(None, max_length=20)
    role: Literal["admin", "superadmin"] = Field("admin")


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)


class UserUpdate(BaseModel):
    username: str | None = Field(None, min_length=4, max_length=50)
    firstname: str | None = Field(None, min_length=2, max_length=20)
    lastname: str | None = Field(None, min_length=2, max_length=20)
    role: Literal["admin", "superadmin"] | None = Field(None)
    password: str | None = Field(None, min_length=8, max_length=128)


class UserLogin(BaseModel):
    username: str = Field(..., min_length=4, max_length=50)
    password: str = Field(..., min_length=8, max_length=128)


class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserMiniResponse(BaseModel):
    id: int
    username: str
    firstname: str | None
    lastname: str | None
    role: Literal["admin", "superadmin"]
    business_id: int | None = None

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserMiniResponse

