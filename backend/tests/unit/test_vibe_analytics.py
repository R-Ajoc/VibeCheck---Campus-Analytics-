from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

import backend.app.models  # noqa: F401
from backend.app.core.database import Base
from backend.app.models.business import Business
from backend.app.models.user import User
from backend.app.models.vibe_snapshot import VibeSnapshot
from backend.app.services.analytics.vibe_analytics import (
	forecast_vibe_score,
	get_latest_vibe,
	get_peak_and_drop,
	get_vibe_score_over_time,
	get_vibe_score_time_series,
	get_vibe_score_trend,
	get_vibe_volatility,
)


@pytest_asyncio.fixture(scope="module")
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
		await conn.execute(VibeSnapshot.__table__.delete())
		await conn.execute(Business.__table__.delete())
		await conn.execute(User.__table__.delete())


async def seed_business(db: AsyncSession) -> Business:
	owner = User(
		username="owner_analytics",
		firstname="Owner",
		lastname="Analytics",
		role="owner",
		hashed_password="hashed",
	)
	db.add(owner)
	await db.flush()

	business = Business(
		name="Analytics Test Business",
		location="Cebu",
		short_description="Test business for analytics",
		image_path=None,
		owner_id=owner.id,
	)
	db.add(business)
	await db.commit()
	await db.refresh(business)
	return business


async def seed_snapshot(
	db: AsyncSession,
	business_id: int,
	snapshot_date: datetime,
	vibe_score: float,
	*,
	vibe_label: str | None = None,
	review_count: int = 5,
) -> VibeSnapshot:
	snapshot = VibeSnapshot(
		business_id=business_id,
		snapshot_date=snapshot_date,
		vibe_score=vibe_score,
		vibe_label=vibe_label or f"label_{vibe_score}",
		review_count=review_count,
		positive_count=3,
		negative_count=2,
		summary_text="summary",
	)
	db.add(snapshot)
	await db.flush()
	await db.commit()
	await db.refresh(snapshot)
	return snapshot


@pytest.mark.asyncio
async def test_get_latest_vibe_returns_latest_snapshot(session_factory):
	async with session_factory() as db:
		business = await seed_business(db)
		first_date = datetime(2026, 5, 1, 8, tzinfo=UTC)
		second_date = datetime(2026, 5, 3, 8, tzinfo=UTC)
		await seed_snapshot(db, business.id, first_date, 3.2, vibe_label="mixed")
		latest = await seed_snapshot(db, business.id, second_date, 4.6, vibe_label="very_positive")

		result = await get_latest_vibe(db, business.id)

	assert result == {
		"vibe_score": latest.vibe_score,
		"vibe_label": latest.vibe_label,
		"reviews_analyzed": latest.review_count,
		"date": latest.snapshot_date,
	}


@pytest.mark.asyncio
async def test_get_latest_vibe_returns_no_data_when_missing(session_factory):
	async with session_factory() as db:
		business = await seed_business(db)

		result = await get_latest_vibe(db, business.id)

	assert result == {"status": "no_data"}


@pytest.mark.asyncio
async def test_get_vibe_volatility_handles_insufficient_data(session_factory):
	async with session_factory() as db:
		business = await seed_business(db)
		base_date = datetime(2026, 5, 1, 8, tzinfo=UTC)
		for index, score in enumerate([3.0, 3.1, 2.9, 3.2]):
			await seed_snapshot(
				db,
				business.id,
				base_date + timedelta(days=index),
				score,
			)

		result = await get_vibe_volatility(db, business.id)

	assert result["volatility"] == 0.0
	assert result["stability"] == "insufficient_data"
	assert result["meta"] == {"is_reliable": False, "sample_size": 4, "min_required": 5}


@pytest.mark.asyncio
async def test_get_vibe_volatility_maps_real_standard_deviation(session_factory):
	async with session_factory() as db:
		business = await seed_business(db)
		base_date = datetime(2026, 5, 1, 8, tzinfo=UTC)
		for index, score in enumerate([1.0, 2.0, 3.0, 4.0, 5.0]):
			await seed_snapshot(
				db,
				business.id,
				base_date + timedelta(days=index),
				score,
			)

		result = await get_vibe_volatility(db, business.id)

	assert result["volatility"] == pytest.approx(1.41421356, rel=1e-6)
	assert result["stability"] == "unstable"
	assert result["meta"] == {"is_reliable": True, "sample_size": 5, "min_required": 5}


@pytest.mark.asyncio
async def test_get_vibe_score_time_series_and_over_time(session_factory):
	async with session_factory() as db:
		business = await seed_business(db)
		base_date = datetime(2026, 5, 1, 8, tzinfo=UTC)

		await seed_snapshot(db, business.id, base_date, 3.0)
		await seed_snapshot(db, business.id, base_date + timedelta(hours=5), 5.0)
		await seed_snapshot(db, business.id, base_date + timedelta(days=1), 4.0)

		daily = await get_vibe_score_time_series(db, business.id, "daily")
		wrapped = await get_vibe_score_over_time(db, business.id, "daily")

	assert daily == [
		{"period": "2026-05-01", "avg_score": 4.0, "snapshot_count": 2},
		{"period": "2026-05-02", "avg_score": 4.0, "snapshot_count": 1},
	]
	assert wrapped == {
		"data": daily,
		"meta": {"is_reliable": False, "sample_size": 2, "min_required": 7},
	}


@pytest.mark.asyncio
async def test_get_vibe_score_time_series_invalid_granularity(session_factory):
	async with session_factory() as db:
		business = await seed_business(db)

		with pytest.raises(ValueError, match="Invalid granularity"):
			await get_vibe_score_time_series(db, business.id, "hourly")


@pytest.mark.asyncio
async def test_get_peak_and_drop_identifies_extremes(session_factory):
	async with session_factory() as db:
		business = await seed_business(db)
		base_date = datetime(2026, 5, 1, 8, tzinfo=UTC)
		scores = [2.0, 5.0, 1.0, 4.0, 2.0]

		for index, score in enumerate(scores):
			await seed_snapshot(
				db,
				business.id,
				base_date + timedelta(days=index),
				score,
			)

		result = await get_peak_and_drop(db, business.id)

	assert result["meta"] == {"is_reliable": True, "sample_size": 5, "min_required": 5}
	assert result["peak"]["title"] == "Best Improvement Day"
	assert result["peak"]["impact"] == "High"
	assert result["peak"]["change"] == 3.0
	assert result["drop"]["title"] == "Biggest Decline Day"
	assert result["drop"]["impact"] == "High"
	assert result["drop"]["change"] == -4.0


@pytest.mark.asyncio
async def test_get_vibe_score_trend_classifies_direction(session_factory):
	async with session_factory() as db:
		business = await seed_business(db)
		base_date = datetime(2026, 1, 1, 8, tzinfo=UTC)

		for index, score in enumerate([1.0, 1.5, 2.0, 2.7, 3.4, 4.1, 4.8]):
			await seed_snapshot(
				db,
				business.id,
				base_date + timedelta(days=index),
				score,
			)

		improving = await get_vibe_score_trend(db, business.id)

		await db.execute(VibeSnapshot.__table__.delete())
		await db.commit()

		for index, score in enumerate([4.8, 4.1, 3.4, 2.7, 2.0, 1.5, 1.0]):
			await seed_snapshot(
				db,
				business.id,
				base_date + timedelta(days=index),
				score,
			)

		declining = await get_vibe_score_trend(db, business.id)

		await db.execute(VibeSnapshot.__table__.delete())
		await db.commit()

		for index, score in enumerate([3.0, 3.1, 3.0, 3.05, 3.02, 3.08, 3.01]):
			await seed_snapshot(
				db,
				business.id,
				base_date + timedelta(days=index),
				score,
			)

		stable = await get_vibe_score_trend(db, business.id)

	assert improving["trend"] == "improving"
	assert improving["meta"] == {"is_reliable": True, "sample_size": 7, "min_required": 7}
	assert declining["trend"] == "declining"
	assert declining["meta"] == {"is_reliable": True, "sample_size": 7, "min_required": 7}
	assert stable["trend"] == "stable"
	assert stable["meta"] == {"is_reliable": True, "sample_size": 7, "min_required": 7}


@pytest.mark.asyncio
async def test_forecast_vibe_score_handles_insufficient_and_full_data(session_factory):
	async with session_factory() as db:
		business = await seed_business(db)
		base_date = datetime(2026, 1, 1, 8, tzinfo=UTC)

		for month, score in enumerate([2.0, 2.5, 3.0, 3.5, 4.0]):
			await seed_snapshot(
				db,
				business.id,
				base_date + timedelta(days=31 * month),
				score,
			)

		insufficient = await forecast_vibe_score(db, business.id)

		await db.execute(VibeSnapshot.__table__.delete())
		await db.commit()

		for month, score in enumerate([1.8, 2.4, 3.0, 3.6, 4.2, 4.8]):
			await seed_snapshot(
				db,
				business.id,
				base_date + timedelta(days=31 * month),
				score,
			)

		forecast = await forecast_vibe_score(db, business.id)

	assert insufficient["status"] == "insufficient_data"
	assert len(insufficient["history"]) == 5
	assert insufficient["forecast"] == []
	assert insufficient["meta"] == {"is_reliable": False, "sample_size": 5, "min_required": 6}

	assert len(forecast["history"]) == 6
	assert len(forecast["forecast"]) == 6
	assert 1.0 <= forecast["forecast_score"] <= 5.0
	assert forecast["predicted_vibe"] in {
		"very_positive",
		"positive",
		"slightly_positive",
		"mixed",
		"slightly_negative",
		"negative",
		"very_negative",
	}
	assert forecast["meta"] == {"is_reliable": True, "sample_size": 6, "min_required": 6}
