from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.database import Base

if TYPE_CHECKING:
    from backend.app.models.confession import Confession


class AspectSentiment(Base):
    __tablename__ = "aspect_sentiments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    sentence: Mapped[str] = mapped_column(Text, nullable=False)
    aspect: Mapped[str] = mapped_column(String(50), nullable=False)

    sentiment_label: Mapped[str] = mapped_column(String(20), nullable=False)
    sentiment_score: Mapped[float] = mapped_column(Float, nullable=False)

    aspect_confidence: Mapped[float] = mapped_column(Float, nullable=False)
    sentiment_confidence: Mapped[float] = mapped_column(Float, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC)
    )

    confession_id: Mapped[int] = mapped_column(
        ForeignKey("confessions.id"), nullable=False, index=True
    )

    confession: Mapped["Confession"] = relationship(
        "Confession", back_populates="aspect_sentiments"
    )