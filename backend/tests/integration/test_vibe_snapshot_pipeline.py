import datetime

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from backend.app.core.database import Base
from backend.app.models.business import Business
from backend.app.models.user import User
from backend.app.models.vibe_snapshot import VibeSnapshot
from backend.app.services import vibe_snapshot_service


@pytest_asyncio.fixture(scope="session")
async def test_engine():
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
    return async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(autouse=True)
async def clear_tables(test_engine):
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


async def seed_business(db: AsyncSession):
    owner = User(username="owner_snap", firstname="Owner", lastname="Test", role="owner", hashed_password="x")
    db.add(owner)
    await db.flush()

    business = Business(name="Snapshot Biz", location="Here", short_description="desc", image_path=None, owner_id=owner.id)
    db.add(business)
    await db.commit()
    await db.refresh(business)
    return business


@pytest.mark.asyncio
async def test_run_vibe_snapshot_and_business_profile_update(session_factory, monkeypatch):
    async with session_factory() as db:
        business = await seed_business(db)

    # Monkeypatch compute_vibe_summary used inside create_vibe_snapshot
    async def fake_compute_vibe_summary(db_sess, business_id, models, as_of_date=None, allow_insufficient_data=False, use_ai_summary=False):
        return {
            "business_id": business_id,
            "avg_score": 0.5,
            "vibe_label": "Mixed",
            "review_count": 5,
            "keywords": ["service", "food"],
            "positive_keywords": ["service"],
            "negative_keywords": ["food"],
            "summary_text": "Guests liked the service but had issues with food.",
            "score_distribution": {"positive": 3, "negative": 2, "is_polarizing": False},
        }

    monkeypatch.setattr(vibe_snapshot_service, "compute_vibe_summary", fake_compute_vibe_summary)

    async with session_factory() as db:
        snapshot_date = datetime.datetime.now(datetime.timezone.utc)
        snapshot = await vibe_snapshot_service.run_vibe_snapshot_pipeline(db, business.id, models=None, snapshot_date=snapshot_date, use_ai_summary=False)

        assert snapshot is not None
        assert isinstance(snapshot, VibeSnapshot)
        assert snapshot.business_id == business.id
        assert snapshot.vibe_label == "Mixed"
        assert snapshot.review_count == 5

        # persisted to DB
        await db.refresh(snapshot)
        q = await db.get(VibeSnapshot, snapshot.id)
        assert q is not None
