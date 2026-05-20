from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class ConfessionBase(BaseModel):
    content: str = Field(...)
    original_content: str | None = None
    source: str = Field("scraped")
    language: str | None = None
    post_date: datetime


class ConfessionCreate(ConfessionBase):
    pass


class ConfessionBulkItem(ConfessionCreate):
    pass


class ConfessionResponse(ConfessionBase):
    id: int
    sentiment_score: float | None = None
    sentiment_label: str | None = None
    imported_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
