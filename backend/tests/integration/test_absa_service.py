import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from backend.app.core.database import Base
from backend.app.models.aspect_sentiment import AspectSentiment
from backend.app.models.business import Business
from backend.app.models.review import Review
from backend.app.models.user import User
from backend.app.services.absa_service import get_review_aspects, run_absa_for_review


class DummyModels:
	def __init__(self):
		self.sentiment = object()
		self.embedding = object()
		self.aspect_embeddings = object()


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
		await conn.execute(AspectSentiment.__table__.delete())
		await conn.execute(Review.__table__.delete())
		await conn.execute(Business.__table__.delete())
		await conn.execute(User.__table__.delete())


async def seed_review(db: AsyncSession, suffix: str = "absa") -> Review:
	owner = User(
		username=f"owner_{suffix}",
		firstname="Owner",
		lastname="Test",
		role="owner",
		hashed_password="hashed",
	)
	reviewer = User(
		username=f"reviewer_{suffix}",
		firstname="Reviewer",
		lastname="Test",
		role="reviewer",
		hashed_password="hashed",
	)
	db.add(owner)
	db.add(reviewer)
	await db.flush()

	business = Business(
		name=f"ABSA Business {suffix}",
		location="Cebu",
		short_description="ABSA integration test",
		image_path=None,
		owner_id=owner.id,
	)
	db.add(business)
	await db.flush()

	review = Review(
		content="Service was fast. Food was average but cleanliness was excellent.",
		sentiment_score=0.0,
		sentiment_label="neutral",
		user_id=reviewer.id,
		business_id=business.id,
	)
	db.add(review)
	await db.commit()
	await db.refresh(review)
	return review


@pytest.mark.asyncio
async def test_run_absa_for_review_persists_aspects_and_deduplicates(db_session, monkeypatch):
	review = await seed_review(db_session, "persist")

	def fake_detect_aspects(sentence, models):
		text = sentence.lower()
		if "service" in text:
			return [("service", 0.91)]
		if "food" in text:
			return [("food", 0.82), ("service", 0.88), ("cleanliness", 0.79)]
		return [("general", 0.4)]

	monkeypatch.setattr("backend.app.services.absa_service.detect_aspects", fake_detect_aspects)
	monkeypatch.setattr(
		"backend.app.services.absa_service.analyze_sentiment",
		lambda text, model: (0.77, "positive", 0.95),
	)

	results = await run_absa_for_review(db_session, review, DummyModels())
	saved = await get_review_aspects(db_session, review.id)

	assert len(results) == 3
	assert len(saved) == 3
	assert {r.aspect for r in saved} == {"service", "food", "cleanliness"}
	assert all(r.review_id == review.id for r in saved)


@pytest.mark.asyncio
async def test_run_absa_for_review_skips_low_confidence_sentiment(db_session, monkeypatch):
	review = await seed_review(db_session, "low_conf")

	monkeypatch.setattr(
		"backend.app.services.absa_service.detect_aspects",
		lambda sentence, models: [("service", 0.87)],
	)
	monkeypatch.setattr(
		"backend.app.services.absa_service.analyze_sentiment",
		lambda text, model: (0.4, "positive", 0.2),
	)

	results = await run_absa_for_review(db_session, review, DummyModels())
	saved = await get_review_aspects(db_session, review.id)

	assert results == []
	assert saved == []


@pytest.mark.asyncio
async def test_get_review_aspects_returns_empty_for_unknown_review(db_session):
	aspects = await get_review_aspects(db_session, 999999)
	assert aspects == []
