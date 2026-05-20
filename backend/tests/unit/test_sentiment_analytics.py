"""
Unit tests for sentiment analytics module.

Tests the functions that compute sentiment analytics for a business:
- get_sentiment_over_time: Time series aggregation with configurable granularity
- get_sentiment_distribution: Sentiment label distribution with percentages
- get_sentiment_trend_slope: Trend classification (improving/declining/stable)
- get_sentiment_volatility: Standard deviation-based stability measure
"""

from datetime import UTC, datetime, timedelta

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

import backend.app.models  # noqa: F401
from backend.app.core.database import Base
from backend.app.models.business import Business
from backend.app.models.review import Review
from backend.app.models.user import User
from backend.app.services.analytics.sentiment_analytics import (
    get_sentiment_distribution,
    get_sentiment_over_time,
    get_sentiment_trend_slope,
    get_sentiment_volatility,
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
        await conn.execute(Review.__table__.delete())
        await conn.execute(Business.__table__.delete())
        await conn.execute(User.__table__.delete())


async def seed_business(db: AsyncSession) -> Business:
    """Create a test business with owner."""
    owner = User(
        username="owner_sentiment",
        firstname="Owner",
        lastname="Sentiment",
        role="owner",
        hashed_password="hashed",
    )
    db.add(owner)
    await db.flush()

    business = Business(
        name="Sentiment Test Restaurant",
        location="Cebu",
        short_description="Test business for sentiment analytics",
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


# ===== SENTIMENT OVER TIME TESTS =====


@pytest.mark.asyncio
async def test_get_sentiment_over_time_daily_granularity(session_factory):
    """Test daily sentiment aggregation with multiple days of reviews."""
    async with session_factory() as db:
        business = await seed_business(db)
        reviewer = await db.execute(select(User).where(User.role == "owner"))
        reviewer = (await db.execute(select(User).limit(1))).scalars().first()
        
        # Create test reviewer if needed
        if not reviewer:
            reviewer = User(
                username="test_reviewer",
                firstname="Test",
                lastname="Reviewer",
                role="reviewer",
                hashed_password="hashed",
            )
            db.add(reviewer)
            await db.flush()

        # Seed reviews across different days
        base_date = datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC)
        
        await seed_review(db, business.id, reviewer.id, "Good", 0.8, "positive", base_date)
        await seed_review(db, business.id, reviewer.id, "Good", 0.9, "positive", base_date)
        await seed_review(db, business.id, reviewer.id, "Bad", -0.7, "negative", base_date + timedelta(days=1))
        await seed_review(db, business.id, reviewer.id, "Great", 0.85, "positive", base_date + timedelta(days=1))
        await seed_review(db, business.id, reviewer.id, "Okay", 0.0, "neutral", base_date + timedelta(days=2))

        result = await get_sentiment_over_time(db, business.id, "daily")

    assert "data" in result
    assert "meta" in result
    assert len(result["data"]) >= 3  # At least 3 days
    
    # Verify each time bucket has the new chart-ready sentiment ratios
    for item in result["data"]:
        assert "period" in item
        assert "positive_ratio" in item
        assert "negative_ratio" in item
        assert "positive_count" in item
        assert "negative_count" in item
        assert "review_count_per_period" in item
        assert "is_reliable" in item
        assert "confidence" in item
        assert item["confidence"] in {"high", "low"}
        assert item["review_count_per_period"] > 0
        assert item["positive_count"] + item["negative_count"] == item["review_count_per_period"]
        if item["review_count_per_period"] > 0:
            total_ratio = item["positive_ratio"] + item["negative_ratio"]
            assert round(total_ratio, 2) == 100.0


@pytest.mark.asyncio
async def test_get_sentiment_over_time_weekly_granularity(session_factory):
    """Test weekly sentiment aggregation."""
    async with session_factory() as db:
        business = await seed_business(db)
        reviewer = (await db.execute(select(User).limit(1))).scalars().first()

        base_date = datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC)
        
        # Reviews in same week
        await seed_review(db, business.id, reviewer.id, "Good", 0.8, "positive", base_date)
        await seed_review(db, business.id, reviewer.id, "Great", 0.9, "positive", base_date + timedelta(days=2))
        
        # Reviews in different week
        await seed_review(db, business.id, reviewer.id, "Bad", -0.6, "negative", base_date + timedelta(days=8))

        result = await get_sentiment_over_time(db, business.id, "weekly")

    assert "data" in result
    assert len(result["data"]) >= 2  # At least 2 weeks
    for item in result["data"]:
        assert "positive_ratio" in item
        assert "negative_ratio" in item
        assert item["confidence"] in {"high", "low"}


@pytest.mark.asyncio
async def test_get_sentiment_over_time_monthly_granularity(session_factory):
    """Test monthly sentiment aggregation."""
    async with session_factory() as db:
        business = await seed_business(db)
        reviewer = (await db.execute(select(User).limit(1))).scalars().first()

        base_date = datetime(2024, 1, 15, 12, 0, 0, tzinfo=UTC)
        
        # Same month
        await seed_review(db, business.id, reviewer.id, "Good", 0.8, "positive", base_date)
        
        # Different months
        await seed_review(db, business.id, reviewer.id, "Great", 0.9, "positive", base_date + timedelta(days=30))

        result = await get_sentiment_over_time(db, business.id, "monthly")

    assert "data" in result
    assert len(result["data"]) >= 2  # At least 2 months
    for item in result["data"]:
        assert "positive_ratio" in item
        assert "negative_ratio" in item
        assert item["confidence"] in {"high", "low"}


@pytest.mark.asyncio
async def test_get_sentiment_over_time_insufficient_data(session_factory):
    """Test sentiment over time with no reviews returns empty data but valid meta."""
    async with session_factory() as db:
        business = await seed_business(db)

    async with session_factory() as db:
        result = await get_sentiment_over_time(db, business.id, "daily")

    assert "data" in result
    assert "meta" in result
    assert len(result["data"]) == 0
    assert result["meta"]["is_reliable"] is False


@pytest.mark.asyncio
async def test_get_sentiment_over_time_invalid_granularity(session_factory):
    """Test sentiment over time with invalid granularity raises ValueError."""
    async with session_factory() as db:
        business = await seed_business(db)

    async with session_factory() as db:
        with pytest.raises(ValueError, match="Invalid granularity"):
            await get_sentiment_over_time(db, business.id, "invalid")


# ===== SENTIMENT DISTRIBUTION TESTS =====


@pytest.mark.asyncio
async def test_get_sentiment_distribution_balanced_mix(session_factory):
    """Test sentiment distribution with balanced positive, negative, neutral reviews."""
    async with session_factory() as db:
        business = await seed_business(db)
        reviewer = (await db.execute(select(User).limit(1))).scalars().first()

        base_date = datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC)
        
        # Create balanced distribution
        await seed_review(db, business.id, reviewer.id, "Positive", 0.9, "positive", base_date)
        await seed_review(db, business.id, reviewer.id, "Positive", 0.8, "positive", base_date + timedelta(days=1))
        await seed_review(db, business.id, reviewer.id, "Negative", -0.9, "negative", base_date + timedelta(days=2))
        await seed_review(db, business.id, reviewer.id, "Negative", -0.8, "negative", base_date + timedelta(days=3))
        await seed_review(db, business.id, reviewer.id, "Neutral", 0.0, "neutral", base_date + timedelta(days=4))

        result = await get_sentiment_distribution(db, business.id)

    assert "distribution" in result
    assert "total_reviews" in result
    assert "meta" in result
    assert result["total_reviews"] == 5
    assert result["meta"]["is_reliable"] is True
    
    dist = result["distribution"]
    assert "positive" in dist
    assert "negative" in dist
    assert "neutral" in dist
    
    # Verify percentages sum to 100
    total_pct = dist["positive"]["percentage"] + dist["negative"]["percentage"] + dist["neutral"]["percentage"]
    assert total_pct == 100.0
    
    # Verify counts match
    assert dist["positive"]["count"] == 2
    assert dist["negative"]["count"] == 2
    assert dist["neutral"]["count"] == 1


@pytest.mark.asyncio
async def test_get_sentiment_distribution_all_positive(session_factory):
    """Test sentiment distribution with all positive reviews."""
    async with session_factory() as db:
        business = await seed_business(db)
        reviewer = (await db.execute(select(User).limit(1))).scalars().first()

        base_date = datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC)
        
        for i in range(5):
            await seed_review(db, business.id, reviewer.id, f"Good {i}", 0.8 + i*0.02, "positive", base_date + timedelta(days=i))

        result = await get_sentiment_distribution(db, business.id)

    dist = result["distribution"]
    assert dist["positive"]["count"] == 5
    assert dist["positive"]["percentage"] == 100.0
    assert dist["negative"]["count"] == 0
    assert dist["neutral"]["count"] == 0


@pytest.mark.asyncio
async def test_get_sentiment_distribution_insufficient_data(session_factory):
    """Test sentiment distribution with less than minimum required reviews."""
    async with session_factory() as db:
        business = await seed_business(db)

    async with session_factory() as db:
        result = await get_sentiment_distribution(db, business.id)

    assert result["total_reviews"] == 0
    assert result["meta"]["is_reliable"] is False


# ===== SENTIMENT TREND TESTS =====


@pytest.mark.asyncio
async def test_get_sentiment_trend_slope_improving(session_factory):
    """Test sentiment trend detection for improving trend."""
    async with session_factory() as db:
        business = await seed_business(db)
        reviewer = (await db.execute(select(User).limit(1))).scalars().first()

        base_date = datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC)
        
        # Create improving trend: scores increase over time
        scores = [-0.8, -0.6, -0.4, -0.2, 0.0, 0.2, 0.4]
        for i, score in enumerate(scores):
            await seed_review(db, business.id, reviewer.id, f"Review {i}", score, "positive" if score > 0 else "negative", base_date + timedelta(days=i))

        result = await get_sentiment_trend_slope(db, business.id)

    assert result["trend"] == "improving"
    assert result["slope"] > 0.01  # Above positive threshold
    assert result["meta"]["is_reliable"] is True


@pytest.mark.asyncio
async def test_get_sentiment_trend_slope_declining(session_factory):
    """Test sentiment trend detection for declining trend."""
    async with session_factory() as db:
        business = await seed_business(db)
        reviewer = (await db.execute(select(User).limit(1))).scalars().first()

        base_date = datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC)
        
        # Create declining trend: scores decrease over time
        scores = [0.8, 0.6, 0.4, 0.2, 0.0, -0.2, -0.4]
        for i, score in enumerate(scores):
            await seed_review(db, business.id, reviewer.id, f"Review {i}", score, "positive" if score > 0 else "negative", base_date + timedelta(days=i))

        result = await get_sentiment_trend_slope(db, business.id)

    assert result["trend"] == "declining"
    assert result["slope"] < -0.01  # Below negative threshold
    assert result["meta"]["is_reliable"] is True


@pytest.mark.asyncio
async def test_get_sentiment_trend_slope_stable(session_factory):
    """Test sentiment trend detection for stable/neutral trend."""
    async with session_factory() as db:
        business = await seed_business(db)
        reviewer = (await db.execute(select(User).limit(1))).scalars().first()

        base_date = datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC)
        
        # Create stable trend: scores stay relatively constant
        scores = [0.5, 0.5, 0.45, 0.55, 0.48, 0.52, 0.5]
        for i, score in enumerate(scores):
            await seed_review(db, business.id, reviewer.id, f"Review {i}", score, "positive", base_date + timedelta(days=i))

        result = await get_sentiment_trend_slope(db, business.id)

    assert result["trend"] == "stable"
    assert -0.01 <= result["slope"] <= 0.01  # Within stable band
    assert result["meta"]["is_reliable"] is True


@pytest.mark.asyncio
async def test_get_sentiment_trend_slope_insufficient_data(session_factory):
    """Test sentiment trend with insufficient data points."""
    async with session_factory() as db:
        business = await seed_business(db)
        reviewer = (await db.execute(select(User).limit(1))).scalars().first()

        base_date = datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC)
        
        # Create only 4 data points (need 5 minimum)
        for i in range(4):
            await seed_review(db, business.id, reviewer.id, f"Review {i}", 0.5, "positive", base_date + timedelta(days=i))

    async with session_factory() as db:
        result = await get_sentiment_trend_slope(db, business.id)

    assert result["trend"] == "insufficient_data"
    assert result["slope"] == 0.0
    assert result["meta"]["is_reliable"] is False


# ===== SENTIMENT VOLATILITY TESTS =====


@pytest.mark.asyncio
async def test_get_sentiment_volatility_high_volatility(session_factory):
    """Test volatility detection with high variation in scores."""
    async with session_factory() as db:
        business = await seed_business(db)
        reviewer = (await db.execute(select(User).limit(1))).scalars().first()

        base_date = datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC)
        
        # High variation: from very negative to very positive
        scores = [-0.9, -0.8, 0.0, 0.8, 0.9]
        for i, score in enumerate(scores):
            await seed_review(db, business.id, reviewer.id, f"Review {i}", score, "positive" if score > 0 else "negative", base_date + timedelta(days=i))

        result = await get_sentiment_volatility(db, business.id)

    assert "volatility" in result
    assert "stability" in result
    assert "interpretation" in result
    assert result["meta"]["is_reliable"] is True
    assert result["volatility"] > 0.5  # Should be high volatility


@pytest.mark.asyncio
async def test_get_sentiment_volatility_low_volatility(session_factory):
    """Test volatility detection with low variation in scores."""
    async with session_factory() as db:
        business = await seed_business(db)
        reviewer = (await db.execute(select(User).limit(1))).scalars().first()

        base_date = datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC)
        
        # Low variation: all scores close together
        scores = [0.5, 0.48, 0.52, 0.49, 0.51]
        for i, score in enumerate(scores):
            await seed_review(db, business.id, reviewer.id, f"Review {i}", score, "positive", base_date + timedelta(days=i))

        result = await get_sentiment_volatility(db, business.id)

    assert result["volatility"] < 0.1  # Should be low volatility
    assert result["meta"]["is_reliable"] is True


@pytest.mark.asyncio
async def test_get_sentiment_volatility_insufficient_data(session_factory):
    """Test volatility with insufficient data points."""
    async with session_factory() as db:
        business = await seed_business(db)
        reviewer = (await db.execute(select(User).limit(1))).scalars().first()

        base_date = datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC)
        
        # Create only 4 data points (need 5 minimum)
        for i in range(4):
            await seed_review(db, business.id, reviewer.id, f"Review {i}", 0.5, "positive", base_date + timedelta(days=i))

    async with session_factory() as db:
        result = await get_sentiment_volatility(db, business.id)

    assert result["volatility"] == 0.0
    assert result["stability"] == "insufficient_data"
    assert result["meta"]["is_reliable"] is False
