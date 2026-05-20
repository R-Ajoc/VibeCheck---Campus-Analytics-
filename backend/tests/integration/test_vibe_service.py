from datetime import UTC, datetime, timedelta

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from backend.app.core.database import Base
from backend.app.models.business import Business
from backend.app.models.review import Review
from backend.app.models.user import User
from backend.app.services.vibe_service import compute_vibe_summary


class DummyKeywordExtractor:
	def extract_keywords(self, text, **kwargs):
		return [
			("service", 0.91),
			("staff", 0.85),
			("cleanliness", 0.82),
			("price", 0.5),
		]


class DummyModels:
	def __init__(self):
		self.sentiment = object()
		self.keyword_extractor = DummyKeywordExtractor()
		self.large_language_model = None


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
async def db_session(test_engine):
	session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
	async with session_factory() as session:
		yield session
		await session.rollback()


@pytest_asyncio.fixture(autouse=True)
async def clear_tables(test_engine):
	async with test_engine.begin() as conn:
		await conn.execute(Review.__table__.delete())
		await conn.execute(Business.__table__.delete())
		await conn.execute(User.__table__.delete())


async def create_owner_and_business(db: AsyncSession, username: str = "owner") -> Business:
	owner = User(
		username=username,
		firstname="Test",
		lastname="Owner",
		role="owner",
		hashed_password="hashed",
	)
	db.add(owner)
	await db.flush()

	business = Business(
		name="Test Resort",
		location="Cebu",
		short_description="Test business",
		image_path=None,
		owner_id=owner.id,
	)
	db.add(business)
	await db.flush()
	await db.commit()
	return business


async def add_review(
	db: AsyncSession,
	*,
	business_id: int,
	user_id: int,
	content: str,
	sentiment_score: float,
	created_at: datetime | None = None,
):
	review = Review(
		content=content,
		sentiment_score=sentiment_score,
		sentiment_label="positive" if sentiment_score >= 0 else "negative",
		business_id=business_id,
		user_id=user_id,
		created_at=created_at or datetime.now(UTC),
	)
	db.add(review)
	await db.flush()


@pytest.mark.asyncio
async def test_compute_vibe_summary_insufficient_data(db_session, monkeypatch):
	monkeypatch.setattr(
		"backend.app.services.vibe_service.analyze_sentiment",
		lambda keyword, model: (0.7, "positive", 0.95),
	)
	models = DummyModels()

	business = await create_owner_and_business(db_session, username="owner_insufficient")
	owner = await db_session.get(User, business.owner_id)

	await add_review(
		db_session,
		business_id=business.id,
		user_id=owner.id,
		content="Great place",
		sentiment_score=0.6,
	)
	await add_review(
		db_session,
		business_id=business.id,
		user_id=owner.id,
		content="Nice service",
		sentiment_score=0.4,
	)
	await db_session.commit()

	result = await compute_vibe_summary(
		db=db_session,
		business_id=business.id,
		models=models,
	)

	assert result["status"] == "insufficient_data"
	assert result["business_id"] == business.id
	assert result["review_count"] == 2


@pytest.mark.asyncio
async def test_compute_vibe_summary_success(db_session, monkeypatch):
	def fake_analyze_sentiment(keyword, model):
		if keyword in {"service", "staff", "cleanliness"}:
			return 0.9, "positive", 0.98
		return -0.6, "negative", 0.98

	monkeypatch.setattr("backend.app.services.vibe_service.analyze_sentiment", fake_analyze_sentiment)
	models = DummyModels()

	business = await create_owner_and_business(db_session, username="owner_success")
	owner = await db_session.get(User, business.owner_id)

	await add_review(
		db_session,
		business_id=business.id,
		user_id=owner.id,
		content="Excellent service and clean rooms",
		sentiment_score=0.8,
	)
	await add_review(
		db_session,
		business_id=business.id,
		user_id=owner.id,
		content="Friendly staff and amazing food",
		sentiment_score=0.7,
	)
	await add_review(
		db_session,
		business_id=business.id,
		user_id=owner.id,
		content="Very relaxing stay",
		sentiment_score=0.9,
	)
	await db_session.commit()

	result = await compute_vibe_summary(
		db=db_session,
		business_id=business.id,
		models=models,
	)

	assert result["business_id"] == business.id
	assert result["review_count"] == 3
	assert result["avg_score"] > 0
	assert result["vibe_label"] in {"Highly Positive", "Positive", "Mixed"}
	assert isinstance(result["summary_text"], str)
	assert result["keywords"]
	assert "score_distribution" in result


@pytest.mark.asyncio
async def test_compute_vibe_summary_respects_as_of_date(db_session, monkeypatch):
	monkeypatch.setattr(
		"backend.app.services.vibe_service.analyze_sentiment",
		lambda keyword, model: (0.8, "positive", 0.95),
	)
	models = DummyModels()

	business = await create_owner_and_business(db_session, username="owner_cutoff")
	owner = await db_session.get(User, business.owner_id)

	now = datetime.now(UTC)
	cutoff = now - timedelta(days=1)

	await add_review(
		db_session,
		business_id=business.id,
		user_id=owner.id,
		content="Older review 1",
		sentiment_score=0.2,
		created_at=now - timedelta(days=3),
	)
	await add_review(
		db_session,
		business_id=business.id,
		user_id=owner.id,
		content="Older review 2",
		sentiment_score=0.4,
		created_at=now - timedelta(days=2),
	)
	await add_review(
		db_session,
		business_id=business.id,
		user_id=owner.id,
		content="Recent review excluded by cutoff",
		sentiment_score=0.9,
		created_at=now,
	)
	await db_session.commit()

	result = await compute_vibe_summary(
		db=db_session,
		business_id=business.id,
		models=models,
		as_of_date=cutoff,
		allow_insufficient_data=True,
	)

	assert result["review_count"] == 2
	assert result["avg_score"] == pytest.approx(0.3, rel=1e-3)
