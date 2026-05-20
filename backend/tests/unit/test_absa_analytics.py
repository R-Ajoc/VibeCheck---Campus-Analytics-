"""
Unit tests for aspect analytics module.

Tests the functions that compute aspect-based sentiment analysis for a business:
- get_aspect_summary: Average sentiment score, mention count, and labels per aspect
- get_aspect_trends: Sentiment trends over time grouped by aspect and month
- get_aspect_frequency: Frequent aspect mining with complete aspect distribution
"""

from datetime import UTC, datetime, timedelta

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

import backend.app.models  # noqa: F401
from backend.app.core.aspects import ASPECTS
from backend.app.core.database import Base
from backend.app.models.aspect_sentiment import AspectSentiment
from backend.app.models.business import Business
from backend.app.models.review import Review
from backend.app.models.user import User
from backend.app.services.analytics.aspect_analytics import (
    get_aspect_frequency,
    get_aspect_summary,
    get_aspect_trends,
)


@pytest_asyncio.fixture(scope="module")
async def test_engine():
    """Create in-memory SQLite test database."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def session_factory(test_engine):
    """Session factory for test database."""
    return async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(autouse=True)
async def clear_tables(test_engine):
    """Clear all tables before each test."""
    async with test_engine.begin() as conn:
        await conn.execute(AspectSentiment.__table__.delete())
        await conn.execute(Review.__table__.delete())
        await conn.execute(Business.__table__.delete())
        await conn.execute(User.__table__.delete())


async def seed_business(db: AsyncSession) -> Business:
    """Create a test business with owner."""
    owner = User(
        username="owner_aspect",
        firstname="Owner",
        lastname="Aspect",
        role="owner",
        hashed_password="hashed",
    )
    db.add(owner)
    await db.flush()

    business = Business(
        name="Aspect Test Restaurant",
        location="Cebu",
        short_description="Test business for aspect analytics",
        image_path=None,
        owner_id=owner.id,
    )
    db.add(business)
    await db.commit()
    await db.refresh(business)
    return business


async def seed_review(
    db: AsyncSession,
    business_id: int,
    user_id: int,
    content: str,
    sentiment_score: float,
    sentiment_label: str,
    created_at: datetime,
) -> Review:
    """Create a test review."""
    review = Review(
        content=content,
        sentiment_score=sentiment_score,
        sentiment_label=sentiment_label,
        user_id=user_id,
        business_id=business_id,
        created_at=created_at,
    )
    db.add(review)
    await db.flush()
    await db.commit()
    await db.refresh(review)
    return review


async def seed_aspect_sentiment(
    db: AsyncSession,
    review_id: int,
    aspect: str,
    sentence: str,
    sentiment_score: float,
    sentiment_label: str,
    aspect_confidence: float = 0.85,
    sentiment_confidence: float = 0.90,
) -> AspectSentiment:
    """Create an aspect sentiment record."""
    aspect_sent = AspectSentiment(
        review_id=review_id,
        sentence=sentence,
        aspect=aspect,
        sentiment_label=sentiment_label,
        sentiment_score=sentiment_score,
        aspect_confidence=aspect_confidence,
        sentiment_confidence=sentiment_confidence,
    )
    db.add(aspect_sent)
    await db.flush()
    await db.commit()
    await db.refresh(aspect_sent)
    return aspect_sent


# ===== ASPECT SUMMARY TESTS =====


@pytest.mark.asyncio
async def test_get_aspect_summary_multiple_aspects(session_factory):
    """Test aspect summary with multiple aspects having different sentiments."""
    async with session_factory() as db:
        business = await seed_business(db)
        reviewer = (await db.execute(select(User).limit(1))).scalars().first()

        base_date = datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC)

        # Create review 1
        review1 = await seed_review(
            db, business.id, reviewer.id, "Good food, slow service", 0.5, "positive", base_date
        )

        # Aspect sentiments for review 1
        await seed_aspect_sentiment(db, review1.id, "food", "Good food", 0.8, "positive")
        await seed_aspect_sentiment(db, review1.id, "service", "slow service", -0.6, "negative")

        # Create review 2
        review2 = await seed_review(
            db, business.id, reviewer.id, "Excellent food, great staff", 0.85, "positive", base_date + timedelta(days=1)
        )

        # Aspect sentiments for review 2
        await seed_aspect_sentiment(db, review2.id, "food", "Excellent food", 0.9, "positive")
        await seed_aspect_sentiment(db, review2.id, "staff", "great staff", 0.7, "positive")

        result = await get_aspect_summary(db, business.id)

    assert "summary" in result
    assert "meta" in result
    assert len(result["summary"]) >= 3  # food, service, staff

    # Verify food aspect (avg of 0.8 and 0.9 = 0.85, should be positive)
    assert "food" in result["summary"]
    food = result["summary"]["food"]
    assert food["count"] == 2
    assert food["avg_score"] == pytest.approx(0.85, abs=0.01)
    assert food["label"] == "positive"

    # Verify service aspect (avg of -0.6 = -0.6, should be negative)
    assert "service" in result["summary"]
    service = result["summary"]["service"]
    assert service["count"] == 1
    assert service["avg_score"] == pytest.approx(-0.6)
    assert service["label"] == "negative"

    # Verify staff aspect (avg of 0.7 = 0.7, should be positive)
    assert "staff" in result["summary"]
    staff = result["summary"]["staff"]
    assert staff["count"] == 1
    assert staff["avg_score"] == pytest.approx(0.7)
    assert staff["label"] == "positive"


@pytest.mark.asyncio
async def test_get_aspect_summary_neutral_aspect(session_factory):
    """Test aspect summary with neutral sentiment (between thresholds)."""
    async with session_factory() as db:
        business = await seed_business(db)
        reviewer = (await db.execute(select(User).limit(1))).scalars().first()

        base_date = datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC)

        # Create review
        review = await seed_review(db, business.id, reviewer.id, "Average price", 0.0, "neutral", base_date)

        # Aspect sentiment with score between -0.2 and 0.2 (neutral threshold)
        await seed_aspect_sentiment(db, review.id, "price", "Average price", 0.1, "positive")

        result = await get_aspect_summary(db, business.id)

    assert "price" in result["summary"]
    assert result["summary"]["price"]["label"] == "neutral"
    assert result["summary"]["price"]["avg_score"] == pytest.approx(0.1)


@pytest.mark.asyncio
async def test_get_aspect_summary_no_data(session_factory):
    """Test aspect summary with no aspect sentiments returns empty summary."""
    async with session_factory() as db:
        business = await seed_business(db)

    async with session_factory() as db:
        result = await get_aspect_summary(db, business.id)

    assert result["summary"] == {}
    assert result["meta"]["is_reliable"] is False


@pytest.mark.asyncio
async def test_get_aspect_summary_threshold_boundaries(session_factory):
    """Test aspect summary at positive and negative threshold boundaries."""
    async with session_factory() as db:
        business = await seed_business(db)
        reviewer = (await db.execute(select(User).limit(1))).scalars().first()

        base_date = datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC)

        review = await seed_review(db, business.id, reviewer.id, "Test", 0.0, "neutral", base_date)

        # Positive threshold boundary (0.2)
        await seed_aspect_sentiment(db, review.id, "food", "Food", 0.2, "positive")
        # Negative threshold boundary (-0.2)
        await seed_aspect_sentiment(db, review.id, "service", "Service", -0.2, "negative")
        # Just above positive threshold
        await seed_aspect_sentiment(db, review.id, "staff", "Staff", 0.21, "positive")
        # Just below negative threshold
        await seed_aspect_sentiment(db, review.id, "cleanliness", "Clean", -0.21, "negative")
        # Strictly neutral
        await seed_aspect_sentiment(db, review.id, "price", "Price", 0.0, "positive")

        result = await get_aspect_summary(db, business.id)

    # At boundary exactly (0.2 and -0.2) should be neutral (using > and < operators, not >= and <=)
    assert result["summary"]["food"]["label"] == "neutral"  # avg=0.2, not > 0.2
    assert result["summary"]["service"]["label"] == "neutral"  # avg=-0.2, not < -0.2
    assert result["summary"]["staff"]["label"] == "positive"  # avg=0.21 > 0.2
    assert result["summary"]["cleanliness"]["label"] == "negative"  # avg=-0.21 < -0.2
    assert result["summary"]["price"]["label"] == "neutral"  # avg=0.0 between thresholds


# ===== ASPECT TRENDS TESTS =====


@pytest.mark.asyncio
async def test_get_aspect_trends_improving_trend(session_factory):
    """Test aspect trends showing improving sentiment over months."""
    async with session_factory() as db:
        business = await seed_business(db)
        reviewer = (await db.execute(select(User).limit(1))).scalars().first()

        # Month 1
        review1 = await seed_review(
            db, business.id, reviewer.id, "Poor food", -0.5, "negative", datetime(2024, 1, 15, 12, 0, 0, tzinfo=UTC)
        )
        await seed_aspect_sentiment(db, review1.id, "food", "Poor food", -0.5, "negative")

        # Month 2
        review2 = await seed_review(
            db, business.id, reviewer.id, "Better food", 0.0, "neutral", datetime(2024, 2, 15, 12, 0, 0, tzinfo=UTC)
        )
        await seed_aspect_sentiment(db, review2.id, "food", "Better food", 0.0, "positive")

        # Month 3
        review3 = await seed_review(
            db, business.id, reviewer.id, "Great food", 0.7, "positive", datetime(2024, 3, 15, 12, 0, 0, tzinfo=UTC)
        )
        await seed_aspect_sentiment(db, review3.id, "food", "Great food", 0.7, "positive")

        result = await get_aspect_trends(db, business.id)

    assert "food" in result["trends"]
    food_trend = result["trends"]["food"]

    # Should have 3 data points (one per month)
    assert len(food_trend["data"]) == 3

    # Should show improving trend (change > 0.05)
    assert food_trend["trend"] == "improving"
    assert food_trend["change"] > 0.05  # 0.7 - (-0.5) = 1.2


@pytest.mark.asyncio
async def test_get_aspect_trends_declining_trend(session_factory):
    """Test aspect trends showing declining sentiment over months."""
    async with session_factory() as db:
        business = await seed_business(db)
        reviewer = (await db.execute(select(User).limit(1))).scalars().first()

        # Month 1
        review1 = await seed_review(
            db, business.id, reviewer.id, "Excellent service", 0.9, "positive", datetime(2024, 1, 15, 12, 0, 0, tzinfo=UTC)
        )
        await seed_aspect_sentiment(db, review1.id, "service", "Excellent", 0.9, "positive")

        # Month 2
        review2 = await seed_review(
            db, business.id, reviewer.id, "Average service", 0.3, "positive", datetime(2024, 2, 15, 12, 0, 0, tzinfo=UTC)
        )
        await seed_aspect_sentiment(db, review2.id, "service", "Average", 0.3, "positive")

        # Month 3
        review3 = await seed_review(
            db, business.id, reviewer.id, "Poor service", -0.3, "negative", datetime(2024, 3, 15, 12, 0, 0, tzinfo=UTC)
        )
        await seed_aspect_sentiment(db, review3.id, "service", "Poor", -0.3, "negative")

        result = await get_aspect_trends(db, business.id)

    assert "service" in result["trends"]
    service_trend = result["trends"]["service"]

    # Should show declining trend (change < -0.05)
    assert service_trend["trend"] == "declining"
    assert service_trend["change"] < -0.05  # -0.3 - 0.9 = -1.2


@pytest.mark.asyncio
async def test_get_aspect_trends_stable_trend(session_factory):
    """Test aspect trends showing stable sentiment over months."""
    async with session_factory() as db:
        business = await seed_business(db)
        reviewer = (await db.execute(select(User).limit(1))).scalars().first()

        # Month 1
        review1 = await seed_review(
            db, business.id, reviewer.id, "Good ambience", 0.5, "positive", datetime(2024, 1, 15, 12, 0, 0, tzinfo=UTC)
        )
        await seed_aspect_sentiment(db, review1.id, "ambience", "Good", 0.5, "positive")

        # Month 2
        review2 = await seed_review(
            db, business.id, reviewer.id, "Good ambience", 0.52, "positive", datetime(2024, 2, 15, 12, 0, 0, tzinfo=UTC)
        )
        await seed_aspect_sentiment(db, review2.id, "ambience", "Good", 0.52, "positive")

        # Month 3
        review3 = await seed_review(
            db, business.id, reviewer.id, "Good ambience", 0.48, "positive", datetime(2024, 3, 15, 12, 0, 0, tzinfo=UTC)
        )
        await seed_aspect_sentiment(db, review3.id, "ambience", "Good", 0.48, "positive")

        result = await get_aspect_trends(db, business.id)

    assert "ambience" in result["trends"]
    ambience_trend = result["trends"]["ambience"]

    # Should show stable trend (change between -0.05 and 0.05)
    assert ambience_trend["trend"] == "stable"
    assert -0.05 <= ambience_trend["change"] <= 0.05


@pytest.mark.asyncio
async def test_get_aspect_trends_single_month(session_factory):
    """Test aspect trends with only one month of data."""
    async with session_factory() as db:
        business = await seed_business(db)
        reviewer = (await db.execute(select(User).limit(1))).scalars().first()

        review = await seed_review(
            db, business.id, reviewer.id, "Good location", 0.6, "positive", datetime(2024, 1, 15, 12, 0, 0, tzinfo=UTC)
        )
        await seed_aspect_sentiment(db, review.id, "location", "Good", 0.6, "positive")

        result = await get_aspect_trends(db, business.id)

    assert "location" in result["trends"]
    location_trend = result["trends"]["location"]

    # Single month should be stable with 0 change
    assert location_trend["trend"] == "stable"
    assert location_trend["change"] == 0


@pytest.mark.asyncio
async def test_get_aspect_trends_no_data(session_factory):
    """Test aspect trends with no aspect sentiments returns empty trends."""
    async with session_factory() as db:
        business = await seed_business(db)

    async with session_factory() as db:
        result = await get_aspect_trends(db, business.id)

    assert result["trends"] == {}
    assert result["meta"]["is_reliable"] is False


# ===== ASPECT FREQUENCY TESTS =====


@pytest.mark.asyncio
async def test_get_aspect_frequency_with_summary(session_factory):
    """Test aspect frequency returns all aspects with correct counts."""
    async with session_factory() as db:
        business = await seed_business(db)
        reviewer = (await db.execute(select(User).limit(1))).scalars().first()

        base_date = datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC)

        # Create aspects
        review = await seed_review(db, business.id, reviewer.id, "Review", 0.5, "positive", base_date)

        await seed_aspect_sentiment(db, review.id, "food", "food text", 0.7, "positive")
        await seed_aspect_sentiment(db, review.id, "service", "service text", 0.3, "positive")
        await seed_aspect_sentiment(db, review.id, "price", "price text", -0.4, "negative")

        # Get summary first
        summary = await get_aspect_summary(db, business.id)

        # Get frequency using summary
        result = await get_aspect_frequency(db, business.id, summary)

    assert "aspects" in result
    assert "status" in result
    assert "meta" in result
    assert result["status"] == "computed"

    # Should include all aspects in ASPECTS constant
    aspect_terms = {a["term"] for a in result["aspects"]}
    assert aspect_terms == set(ASPECTS.keys())

    # Verify counts match
    aspect_dict = {a["term"]: a["count"] for a in result["aspects"]}
    assert aspect_dict["food"] == 1
    assert aspect_dict["service"] == 1
    assert aspect_dict["price"] == 1
    # All other aspects should have 0 count
    assert aspect_dict["staff"] == 0
    assert aspect_dict["cleanliness"] == 0


@pytest.mark.asyncio
async def test_get_aspect_frequency_no_summary(session_factory):
    """Test aspect frequency with no aspect data shows all aspects with zero counts."""
    async with session_factory() as db:
        business = await seed_business(db)

    async with session_factory() as db:
        summary = await get_aspect_summary(db, business.id)
        result = await get_aspect_frequency(db, business.id, summary)

    assert result["status"] == "no_data"
    assert len(result["aspects"]) == len(ASPECTS)

    # All aspects should have 0 count
    for aspect in result["aspects"]:
        assert aspect["count"] == 0
        assert aspect["term"] in ASPECTS


@pytest.mark.asyncio
async def test_get_aspect_frequency_multiple_mentions(session_factory):
    """Test aspect frequency with multiple mentions of same aspect."""
    async with session_factory() as db:
        business = await seed_business(db)
        reviewer = (await db.execute(select(User).limit(1))).scalars().first()

        base_date = datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC)

        # Multiple reviews mentioning food
        for i in range(5):
            review = await seed_review(
                db, business.id, reviewer.id, f"Review {i}", 0.5, "positive", base_date + timedelta(days=i)
            )
            await seed_aspect_sentiment(db, review.id, "food", "food text", 0.7, "positive")

        summary = await get_aspect_summary(db, business.id)
        result = await get_aspect_frequency(db, business.id, summary)

    aspect_dict = {a["term"]: a["count"] for a in result["aspects"]}
    assert aspect_dict["food"] == 5
