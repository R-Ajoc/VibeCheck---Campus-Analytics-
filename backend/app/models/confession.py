from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.database import Base

if TYPE_CHECKING:
    from backend.app.models.aspect_sentiment import AspectSentiment


class Confession(Base): 
    __tablename__ = "confessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    original_content: Mapped[str | None] = mapped_column(Text, nullable=True)

    sentiment_score: Mapped[float | None] = mapped_column(nullable=True)
    sentiment_label: Mapped[str | None] = mapped_column(String(20), nullable=True)

    source: Mapped[str] = mapped_column(String(20), nullable=False, default="scraped")
    language: Mapped[str | None] = mapped_column(String(10), nullable=True)

    post_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    imported_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC)
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC)
    )

    aspect_sentiments: Mapped[list["AspectSentiment"]] = relationship(
        "AspectSentiment", back_populates="confession", cascade="all, delete-orphan"
    )