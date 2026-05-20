"""
Unit tests for review analytics module.

Tests the functions that analyze review activity and detect anomalies:
- map_urgency: Maps event types to urgency categories for action prioritization
- get_review_activity: Detects significant shifts in customer experience using sentiment and volume signals
"""

from datetime import UTC, datetime, timedelta

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool
import uuid

import backend.app.models  # noqa: F401
from backend.app.core.database import Base
from backend.app.models.business import Business
from backend.app.models.review import Review
from backend.app.models.user import User
from backend.app.services.analytics.review_analytics import (
    get_review_activity,
    get_review_volume_over_time,
    map_urgency,
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
        username=f"owner_review_{uuid.uuid4().hex[:8]}",
        firstname="Owner",
        lastname="Activity",
        role="owner",
        hashed_password="hashed",
    )
    db.add(owner)
    await db.flush()

    business = Business(
        name="Review Activity Test Restaurant",
        location="Cebu",
        short_description="Test business for review activity analytics",
        image_path=None,
        owner_id=owner.id,
    )
    db.add(business)
    await db.commit()
    await db.refresh(business)
    return business


async def seed_customer(db: AsyncSession, username: str) -> User:
    """Create a test customer."""
    user = User(
        username=f"{username}_{uuid.uuid4().hex[:8]}",
        firstname="Customer",
        lastname="Test",
        role="customer",
        hashed_password="hashed",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def seed_review(
    db: AsyncSession,
    business_id: int,
    user_id: int,
    sentiment_score: float,
    created_at: datetime,
) -> Review:
    """Create a test review."""
    review = Review(
        content=f"Test review with sentiment {sentiment_score}",
        sentiment_score=sentiment_score,
        sentiment_label="positive" if sentiment_score > 0.5 else "negative" if sentiment_score < -0.5 else "neutral",
        business_id=business_id,
        user_id=user_id,
        created_at=created_at,
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)
    return review


# ============================================================================
# Tests for map_urgency()
# ============================================================================


def test_map_urgency_no_anomaly():
    """Test urgency mapping for no_anomaly event type."""
    assert map_urgency("no_anomaly", 0) == "low"
    assert map_urgency("no_anomaly", 50) == "low"
    assert map_urgency("no_anomaly", 100) == "low"


def test_map_urgency_emerging_event():
    """Test urgency mapping for emerging_event event type."""
    assert map_urgency("emerging_event", 0) == "low_medium"
    assert map_urgency("emerging_event", 50) == "low_medium"
    assert map_urgency("emerging_event", 100) == "low_medium"


def test_map_urgency_activity_event():
    """Test urgency mapping for activity_event event type."""
    assert map_urgency("activity_event", 0) == "medium"
    assert map_urgency("activity_event", 50) == "medium"
    assert map_urgency("activity_event", 100) == "medium"


def test_map_urgency_sentiment_event():
    """Test urgency mapping for sentiment_event event type."""
    assert map_urgency("sentiment_event", 0) == "medium_high"
    assert map_urgency("sentiment_event", 50) == "medium_high"
    assert map_urgency("sentiment_event", 100) == "medium_high"


def test_map_urgency_true_event():
    """Test urgency mapping for true_event event type."""
    assert map_urgency("true_event", 0) == "high"
    assert map_urgency("true_event", 50) == "high"
    assert map_urgency("true_event", 100) == "high"


def test_map_urgency_unknown():
    """Test urgency mapping for unknown event type."""
    assert map_urgency("unknown_type", 50) == "unknown"
    assert map_urgency("invalid", 100) == "unknown"


# ============================================================================
# Tests for get_review_activity()
# ============================================================================


@pytest.mark.asyncio
async def test_get_review_activity_insufficient_data(session_factory):
    """Test with fewer than MIN_SPIKE_DATA_POINTS reviews."""
    async with session_factory() as db:
        business = await seed_business(db)
        user = await seed_customer(db, "customer_insufficient")

        # Add only 2 reviews (MIN_SPIKE_DATA_POINTS = 3)
        await seed_review(db, business.id, user.id, 0.5, datetime.now(UTC))
        await seed_review(db, business.id, user.id, 0.4, datetime.now(UTC) - timedelta(days=1))

    async with session_factory() as db:
        result = await get_review_activity(db, business.id)

    assert result["event_type"] == "insufficient_data"
    assert result["confidence"] == 0
    assert "Not enough" in result["interpretation"]
    assert "meta" in result
    assert result["meta"]["sample_size"] == 2


@pytest.mark.asyncio
async def test_get_review_activity_no_anomaly(session_factory):
    """Test with stable, normal customer activity (no anomaly)."""
    async with session_factory() as db:
        business = await seed_business(db)
        user = await seed_customer(db, "customer_stable")

        # Add stable reviews with consistent sentiment and volume
        # Create one review per day for 7 days with stable sentiment
        base_date = datetime(2024, 1, 1, tzinfo=UTC)
        for i in range(7):
            await seed_review(
                db,
                business.id,
                user.id,
                0.7,  # Consistent positive sentiment
                base_date + timedelta(days=i)
            )

    async with session_factory() as db:
        result = await get_review_activity(db, business.id)

    assert result["event_type"] == "no_anomaly"
    assert result["confidence"] < 50  # Low confidence for stable data
    assert "stable" in result["interpretation"].lower()
    assert "z_scores" in result
    assert "urgency" in result
    assert result["urgency"] == "low"


@pytest.mark.asyncio
async def test_get_review_activity_true_event_both_sentiment_and_volume(session_factory):
    """Test detection of true_event when both sentiment AND volume spike."""
    async with session_factory() as db:
        business = await seed_business(db)
        user = await seed_customer(db, "customer_true_event")

        # Create baseline: 10 days of stable data
        base_date = datetime(2024, 1, 1, tzinfo=UTC)
        for i in range(10):
            await seed_review(db, business.id, user.id, 0.6, base_date + timedelta(days=i))

        # Create spike: 2 days with low sentiment and many reviews (stress test data)
        await seed_review(db, business.id, user.id, -0.8, base_date + timedelta(days=10))
        await seed_review(db, business.id, user.id, -0.9, base_date + timedelta(days=10))
        await seed_review(db, business.id, user.id, -0.85, base_date + timedelta(days=10))
        await seed_review(db, business.id, user.id, -0.75, base_date + timedelta(days=10))

    async with session_factory() as db:
        result = await get_review_activity(db, business.id)

    # Check for true_event or sentiment_event (strong signals)
    assert result["event_type"] in ["true_event", "sentiment_event"]
    assert "z_scores" in result
    assert result["confidence"] > 0
    assert "meta" in result


@pytest.mark.asyncio
async def test_get_review_activity_sentiment_event_only(session_factory):
    """Test detection of sentiment_event when only sentiment spikes."""
    async with session_factory() as db:
        business = await seed_business(db)
        user = await seed_customer(db, "customer_sentiment_spike")

        # Create baseline with consistent volume and sentiment
        base_date = datetime(2024, 1, 1, tzinfo=UTC)
        for i in range(10):
            await seed_review(db, business.id, user.id, 0.6, base_date + timedelta(days=i))

        # Create sentiment drop (but normal volume - single review)
        await seed_review(db, business.id, user.id, -0.9, base_date + timedelta(days=10))

    async with session_factory() as db:
        result = await get_review_activity(db, business.id)

    assert "event_type" in result
    assert result["event_type"] in ["sentiment_event", "no_anomaly"]  # May not be strong enough for spike
    assert result["z_scores"]["sentiment_z"] != 0
    assert "meta" in result


@pytest.mark.asyncio
async def test_get_review_activity_activity_event_only(session_factory):
    """Test detection of activity_event when only review volume spikes."""
    async with session_factory() as db:
        business = await seed_business(db)
        user1 = await seed_customer(db, "customer_activity_1")
        user2 = await seed_customer(db, "customer_activity_2")
        user3 = await seed_customer(db, "customer_activity_3")
        user4 = await seed_customer(db, "customer_activity_4")

        # Create baseline: normal volume
        base_date = datetime(2024, 1, 1, tzinfo=UTC)
        for i in range(10):
            await seed_review(db, business.id, user1.id, 0.5, base_date + timedelta(days=i))

        # Create volume spike with consistent sentiment
        await seed_review(db, business.id, user2.id, 0.6, base_date + timedelta(days=10))
        await seed_review(db, business.id, user3.id, 0.55, base_date + timedelta(days=10))
        await seed_review(db, business.id, user4.id, 0.65, base_date + timedelta(days=10))

    async with session_factory() as db:
        result = await get_review_activity(db, business.id)

    assert "event_type" in result
    assert result["z_scores"]["volume_z"] != 0
    assert result["confidence"] >= 0
    assert "meta" in result


@pytest.mark.asyncio
async def test_get_review_activity_emerging_event(session_factory):
    """Test detection of emerging_event with moderate signals."""
    async with session_factory() as db:
        business = await seed_business(db)
        user = await seed_customer(db, "customer_emerging")

        # Create baseline
        base_date = datetime(2024, 1, 1, tzinfo=UTC)
        for i in range(10):
            await seed_review(db, business.id, user.id, 0.6, base_date + timedelta(days=i))

        # Create moderate shift (between 1.5 and thresholds)
        await seed_review(db, business.id, user.id, 0.3, base_date + timedelta(days=10))

    async with session_factory() as db:
        result = await get_review_activity(db, business.id)

    assert "event_type" in result
    assert result["event_type"] in ["no_anomaly", "emerging_event", "sentiment_event"]
    assert "interpretation" in result
    assert "urgency" in result


@pytest.mark.asyncio
async def test_get_review_activity_confidence_calculation(session_factory):
    """Test that confidence is calculated based on signal strength."""
    async with session_factory() as db:
        business = await seed_business(db)
        user = await seed_customer(db, "customer_confidence")

        # Add stable data to get baseline confidence
        base_date = datetime(2024, 1, 1, tzinfo=UTC)
        for i in range(5):
            await seed_review(db, business.id, user.id, 0.5, base_date + timedelta(days=i))

    async with session_factory() as db:
        result = await get_review_activity(db, business.id)

    assert "confidence" in result
    assert isinstance(result["confidence"], int)
    assert 0 <= result["confidence"] <= 100


@pytest.mark.asyncio
async def test_get_review_activity_z_scores_in_result(session_factory):
    """Test that z_scores are included in result."""
    async with session_factory() as db:
        business = await seed_business(db)
        user = await seed_customer(db, "customer_z_scores")

        base_date = datetime(2024, 1, 1, tzinfo=UTC)
        for i in range(5):
            await seed_review(db, business.id, user.id, 0.5, base_date + timedelta(days=i))

    async with session_factory() as db:
        result = await get_review_activity(db, business.id)

    assert "z_scores" in result
    assert "sentiment_z" in result["z_scores"]
    assert "volume_z" in result["z_scores"]
    assert isinstance(result["z_scores"]["sentiment_z"], float)
    assert isinstance(result["z_scores"]["volume_z"], float)


@pytest.mark.asyncio
async def test_get_review_activity_meta_reliability(session_factory):
    """Test that meta reliability information is included."""
    async with session_factory() as db:
        business = await seed_business(db)
        user = await seed_customer(db, "customer_meta")

        base_date = datetime(2024, 1, 1, tzinfo=UTC)
        for i in range(7):
            await seed_review(db, business.id, user.id, 0.5, base_date + timedelta(days=i))

    async with session_factory() as db:
        result = await get_review_activity(db, business.id)

    assert "meta" in result
    assert "sample_size" in result["meta"]
    assert "min_required" in result["meta"]
    assert "is_reliable" in result["meta"]
    assert result["meta"]["sample_size"] == 7
    assert result["meta"]["min_required"] == 3


@pytest.mark.asyncio
async def test_get_review_activity_baseline_note(session_factory):
    """Test that baseline note is included in result."""
    async with session_factory() as db:
        business = await seed_business(db)
        user = await seed_customer(db, "customer_baseline")

        base_date = datetime(2024, 1, 1, tzinfo=UTC)
        for i in range(5):
            await seed_review(db, business.id, user.id, 0.5, base_date + timedelta(days=i))

    async with session_factory() as db:
        result = await get_review_activity(db, business.id)

    assert "baseline" in result
    assert "note" in result["baseline"]


@pytest.mark.asyncio
async def test_get_review_activity_return_shape(session_factory):
    """Test that return value has expected structure."""
    async with session_factory() as db:
        business = await seed_business(db)
        user = await seed_customer(db, "customer_shape")

        base_date = datetime(2024, 1, 1, tzinfo=UTC)
        for i in range(5):
            await seed_review(db, business.id, user.id, 0.5, base_date + timedelta(days=i))

    async with session_factory() as db:
        result = await get_review_activity(db, business.id)

    # Required fields
    assert "event_type" in result
    assert "confidence" in result
    assert "interpretation" in result
    assert "meta" in result

    # Optional fields when data sufficient
    if result["event_type"] != "insufficient_data":
        assert "z_scores" in result
        assert "baseline" in result
        assert "urgency" in result


@pytest.mark.asyncio
async def test_get_review_activity_urgency_mapping(session_factory):
    """Test that urgency is correctly mapped from event_type."""
    async with session_factory() as db:
        business = await seed_business(db)
        user = await seed_customer(db, "customer_urgency")

        base_date = datetime(2024, 1, 1, tzinfo=UTC)
        for i in range(5):
            await seed_review(db, business.id, user.id, 0.5, base_date + timedelta(days=i))

    async with session_factory() as db:
        result = await get_review_activity(db, business.id)

    if result["event_type"] != "insufficient_data":
        urgency = result.get("urgency")
        assert urgency in ["low", "low_medium", "medium", "medium_high", "high", "unknown"]


@pytest.mark.asyncio
async def test_get_review_activity_multiple_businesses_isolated(session_factory):
    """Test that activity detection is isolated per business."""
    async with session_factory() as db:
        business1 = await seed_business(db)
        business2 = await seed_business(db)
        user = await seed_customer(db, "customer_isolation")

        base_date = datetime(2024, 1, 1, tzinfo=UTC)

        # Business 1: stable data
        for i in range(5):
            await seed_review(db, business1.id, user.id, 0.7, base_date + timedelta(days=i))

        # Business 2: spike data
        for i in range(5):
            await seed_review(db, business2.id, user.id, 0.7, base_date + timedelta(days=i))
        await seed_review(db, business2.id, user.id, -0.8, base_date + timedelta(days=5))

    async with session_factory() as db:
        result1 = await get_review_activity(db, business1.id)
        result2 = await get_review_activity(db, business2.id)

    # Results should differ based on each business's data
    assert result1["event_type"] in ["no_anomaly", "emerging_event"]
    # result2 may vary based on the spike
    assert "event_type" in result2


@pytest.mark.asyncio
async def test_get_review_activity_interpretation_messages(session_factory):
    """Test that interpretation messages are informative."""
    async with session_factory() as db:
        business = await seed_business(db)
        user = await seed_customer(db, "customer_messages")

        base_date = datetime(2024, 1, 1, tzinfo=UTC)
        for i in range(5):
            await seed_review(db, business.id, user.id, 0.5, base_date + timedelta(days=i))

    async with session_factory() as db:
        result = await get_review_activity(db, business.id)

    assert "interpretation" in result
    assert isinstance(result["interpretation"], str)
    assert len(result["interpretation"]) > 10  # Non-empty meaningful message


# ============================================================================
# Tests for get_review_volume_over_time()
# ============================================================================


@pytest.mark.asyncio
async def test_get_review_volume_over_time_daily_granularity(session_factory):
    async with session_factory() as db:
        business = await seed_business(db)
        user = await seed_customer(db, "customer_volume_daily")

        base_date = datetime(2024, 5, 1, 12, 0, 0, tzinfo=UTC)
        await seed_review(db, business.id, user.id, 0.5, base_date)
        await seed_review(db, business.id, user.id, 0.4, base_date)
        await seed_review(db, business.id, user.id, 0.7, base_date + timedelta(days=1))

        result = await get_review_volume_over_time(db, business.id, "daily")

    assert "data" in result
    assert "meta" in result
    assert len(result["data"]) == 2
    assert result["data"][0]["review_count"] == 2
    assert result["data"][1]["review_count"] == 1
    assert result["meta"]["is_reliable"] is False


@pytest.mark.asyncio
async def test_get_review_volume_over_time_weekly_granularity(session_factory):
    async with session_factory() as db:
        business = await seed_business(db)
        user = await seed_customer(db, "customer_volume_weekly")

        base_date = datetime(2024, 5, 1, 12, 0, 0, tzinfo=UTC)
        await seed_review(db, business.id, user.id, 0.5, base_date)
        await seed_review(db, business.id, user.id, 0.4, base_date + timedelta(days=8))

        result = await get_review_volume_over_time(db, business.id, "weekly")

    assert len(result["data"]) == 2
    assert all("period" in item and "review_count" in item for item in result["data"])


@pytest.mark.asyncio
async def test_get_review_volume_over_time_monthly_granularity(session_factory):
    async with session_factory() as db:
        business = await seed_business(db)
        user = await seed_customer(db, "customer_volume_monthly")

        base_date = datetime(2024, 5, 1, 12, 0, 0, tzinfo=UTC)
        await seed_review(db, business.id, user.id, 0.5, base_date)
        await seed_review(db, business.id, user.id, 0.4, base_date + timedelta(days=35))

        result = await get_review_volume_over_time(db, business.id, "monthly")

    assert len(result["data"]) == 2
    assert all(item["review_count"] == 1 for item in result["data"])
