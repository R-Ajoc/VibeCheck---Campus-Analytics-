"""
Real NLP integration test: Full pipeline with actual ML models, real embeddings, real sentence splitting, 
real ABSA aspect detection, and complete DB → API serialization.

Tests the COMPLETE flow:
  API /api/reviews (POST) 
  → review_service.create_review (no mocks)
  → sentiment_service.analyze_sentiment (real sentiment model)
  → absa_service.run_absa_for_review (real embeddings, real sentence splitting, real aspect detection)
  → AspectSentiment rows persisted to DB
  → API response with real confidence scores and aspect sentiments

Validates:
  ✓ Real embedding model behavior (cosine similarity for aspect matching)
  ✓ Real sentence splitting behavior (split_sentences with and/comma logic)
  ✓ Real sentiment model behavior (both review-level and aspect-level)
  ✓ API layer & FastAPI response serialization
  ✓ DB lazy-loading through proper eager-loading (selectinload)
  ✓ Async ORM and transaction handling
"""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sentence_transformers import SentenceTransformer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import selectinload
from sqlalchemy.pool import StaticPool
from transformers import pipeline

import backend.app.models  # noqa: F401
import backend.app.services.auth_service as auth_service
from backend.app.core.aspects import ASPECTS
from backend.app.core.database import Base, get_db
from backend.app.core.ml_registry import MLRegistry
from backend.app.main import app
from backend.app.models.aspect_sentiment import AspectSentiment
from backend.app.models.business import Business
from backend.app.models.review import Review
from backend.app.models.user import User


@pytest_asyncio.fixture(scope="module")
async def real_models():
    """
    Load REAL ML models once per module.
    - Sentiment analysis: distilbert-base-uncased-finetuned-sst-2-english
    - Embeddings: all-MiniLM-L6-v2 (used in ABSA for aspect detection via cosine similarity)
    - Aspect embeddings: pre-computed from ASPECTS constant
    """
    sentiment_pipeline = pipeline(
        "sentiment-analysis",
        model="distilbert-base-uncased-finetuned-sst-2-english"
    )

    embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

    # Pre-compute aspect embeddings from ASPECTS constant
    aspect_texts = list(ASPECTS.values())
    aspect_embeddings = embedding_model.encode(
        aspect_texts,
        convert_to_tensor=True
    )

    return MLRegistry(
        sentiment=sentiment_pipeline,
        embedding=embedding_model,
        aspect_embeddings=aspect_embeddings,
        keyword_extractor=None,
    )


@pytest_asyncio.fixture(scope="module")
async def test_engine():
    """Create in-memory test database for real ORM testing."""
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
    """Session factory for test DB."""
    return async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(autouse=True)
async def clear_tables(test_engine):
    """Clear all tables before each test to avoid cross-test pollution."""
    async with test_engine.begin() as conn:
        await conn.execute(AspectSentiment.__table__.delete())
        await conn.execute(Review.__table__.delete())
        await conn.execute(Business.__table__.delete())
        await conn.execute(User.__table__.delete())


async def seed_test_data(db: AsyncSession) -> tuple[User, Business]:
    """Create test user and business."""
    owner = User(
        username="real_owner",
        firstname="Owner",
        lastname="Test",
        role="owner",
        hashed_password="hashed",
    )
    reviewer = User(
        username="real_reviewer",
        firstname="Reviewer",
        lastname="Test",
        role="reviewer",
        hashed_password="hashed",
    )
    db.add(owner)
    db.add(reviewer)
    await db.flush()

    business = Business(
        name="Real NLP Restaurant",
        location="Cebu",
        short_description="Real ML inference test",
        image_path=None,
        owner_id=owner.id,
    )
    db.add(business)
    await db.commit()
    await db.refresh(reviewer)
    await db.refresh(business)
    return reviewer, business


@pytest.mark.asyncio
async def test_full_pipeline_review_creation_and_absa_with_real_models(session_factory, real_models):
    """
    FULL PIPELINE TEST: Review creation → real sentiment analysis → real ABSA → DB persistence → API response
    
    Validates:
    1. Real sentiment model correctly analyzes review-level sentiment
    2. Real sentence splitting (split_sentences) splits multi-sentence reviews correctly
    3. Real ABSA detects aspects using real embeddings and cosine similarity
    4. Real sentiment model analyzes sentiment for each aspect sentence
    5. AspectSentiment rows are correctly persisted to DB
    6. API response includes all aspects with real confidence scores (not mocked values)
    7. DB eager-loading (selectinload) works correctly for response serialization
    """
    # Setup: Create user and business in DB
    async with session_factory() as db:
        reviewer, business = await seed_test_data(db)

    # Configure app with real models (no mocks on service layer)
    app.state.models = real_models

    async def override_get_db():
        async with session_factory() as session:
            yield session

    async def override_user():
        return reviewer

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[auth_service.get_authenticated_user] = override_user

    # Execute: POST /api/reviews with multi-aspect review content
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        review_content = (
            "The service was incredibly slow, we waited 45 minutes. "
            "However, the food was delicious and the staff was very friendly and professional. "
            "The restaurant was clean and the ambience was perfect."
        )

        response = await client.post(
            "/api/reviews",
            json={
                "content": review_content,
                "business_id": business.id,
            },
        )

        # Validate HTTP response
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        review_data = response.json()

        # ===== VALIDATION: Review-level sentiment (real model output) =====
        assert "sentiment_label" in review_data
        assert review_data["sentiment_label"] in ["positive", "negative"]
        
        # For mixed review (positive food+staff+cleanliness, negative service), 
        # overall sentiment depends on what dominates in the model
        assert "sentiment_score" in review_data
        assert -1.0 <= review_data["sentiment_score"] <= 1.0, \
            f"Sentiment score out of bounds: {review_data['sentiment_score']}"

        # ===== VALIDATION: Aspect detection (real embeddings + real sentence splitting) =====
        assert "aspect_sentiments" in review_data
        aspects = review_data["aspect_sentiments"]
        
        # Real ABSA should detect multiple aspects from the multi-aspect review
        assert len(aspects) >= 2, \
            f"Expected at least 2 aspects detected (service, food, staff, ambience), got {len(aspects)}"

        # Verify all detected aspects are valid (from ASPECTS constant)
        detected_aspect_names = {a["aspect"] for a in aspects}
        valid_aspect_names = set(ASPECTS.keys())
        assert detected_aspect_names.issubset(valid_aspect_names), \
            f"Invalid aspects detected: {detected_aspect_names - valid_aspect_names}"

        # ===== VALIDATION: Aspect-level sentiment (real model outputs) =====
        for aspect in aspects:
            # Each aspect must have these fields from real inference
            assert "aspect" in aspect, "Missing 'aspect' field"
            assert "sentiment_label" in aspect, "Missing 'sentiment_label' in aspect"

            # Validate sentiment label
            assert aspect["sentiment_label"] in ["positive", "negative"], \
                f"Invalid aspect sentiment label: {aspect['sentiment_label']}"

        # Verify known aspects are detected with correct sentiment direction
        aspects_dict = {a["aspect"]: a for a in aspects}
        
        # Service should be NEGATIVE (slow waiting)
        if "service" in aspects_dict:
            assert aspects_dict["service"]["sentiment_label"] == "negative", \
                "Service should be negative (slow waiting mentioned)"
        
        # Food should be POSITIVE (delicious)
        if "food" in aspects_dict:
            assert aspects_dict["food"]["sentiment_label"] == "positive", \
                "Food should be positive (delicious mentioned)"
        
        # Staff should be POSITIVE (friendly, professional)
        if "staff" in aspects_dict:
            assert aspects_dict["staff"]["sentiment_label"] == "positive", \
                "Staff should be positive (friendly, professional mentioned)"

        review_id = review_data["id"]

        # ===== VALIDATION: DB persistence (real ORM, eager-loading, serialization) =====
        async with session_factory() as db:
            # Fetch review with eager-loading (selectinload) to test lazy-load fix
            result = await db.execute(
                select(Review)
                .where(Review.id == review_id)
                .options(
                    selectinload(Review.user),
                    selectinload(Review.aspect_sentiments),
                )
            )
            review_from_db = result.scalars().first()

            # Review must exist in DB
            assert review_from_db is not None, f"Review {review_id} not found in DB"
            
            # Review sentiment must match API response
            assert review_from_db.sentiment_label in ["positive", "negative"]
            assert -1.0 <= review_from_db.sentiment_score <= 1.0

            # Aspect sentiments must be persisted
            persisted_aspects = review_from_db.aspect_sentiments
            assert len(persisted_aspects) >= 2, \
                f"Expected at least 2 aspects in DB, got {len(persisted_aspects)}"

            # Verify each persisted aspect
            for aspect_sent in persisted_aspects:
                assert aspect_sent.aspect in valid_aspect_names
                assert aspect_sent.sentiment_label in ["positive", "negative"]
                assert 0 <= aspect_sent.aspect_confidence <= 1.0
                assert 0 <= aspect_sent.sentiment_confidence <= 1.0


@pytest.mark.asyncio
async def test_sentence_splitting_with_multiple_sentences(session_factory, real_models):
    """
    Test that real sentence splitting (split_sentences) correctly handles:
    - Multiple sentences with different aspects
    - Comma-separated clauses
    - And-joined clauses
    """
    async with session_factory() as db:
        reviewer, business = await seed_test_data(db)

    app.state.models = real_models

    async def override_get_db():
        async with session_factory() as session:
            yield session

    async def override_user():
        return reviewer

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[auth_service.get_authenticated_user] = override_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Review with multiple distinct sentences and aspects
        review_content = (
            "The location was convenient, clean, and safe. "
            "Service was fast and efficient. "
            "Food tasted great and portions were generous."
        )

        response = await client.post(
            "/api/reviews",
            json={
                "content": review_content,
                "business_id": business.id,
            },
        )

        assert response.status_code == 201
        review = response.json()

        # Should detect multiple aspects across different sentences
        aspects = review["aspect_sentiments"]
        assert len(aspects) >= 3, \
            f"Expected at least 3 aspects (location, service, food), got {len(aspects)}"

        # All should be positive (no complaints in the review)
        for aspect in aspects:
            assert aspect["sentiment_label"] == "positive", \
                f"All aspects should be positive, but {aspect['aspect']} is {aspect['sentiment_label']}"


@pytest.mark.asyncio
async def test_embedding_similarity_aspect_detection(session_factory, real_models):
    """
    Test that real embeddings correctly identify aspects through cosine similarity.
    Reviews with explicit aspect keywords should be detected accurately.
    """
    async with session_factory() as db:
        reviewer, business = await seed_test_data(db)

    app.state.models = real_models

    async def override_get_db():
        async with session_factory() as session:
            yield session

    async def override_user():
        return reviewer

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[auth_service.get_authenticated_user] = override_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Review explicitly mentioning "price" aspect
        review_content = "The price is way too expensive for the portion size. Very overpriced."

        response = await client.post(
            "/api/reviews",
            json={
                "content": review_content,
                "business_id": business.id,
            },
        )

        assert response.status_code == 201
        review = response.json()

        aspects = review["aspect_sentiments"]
        aspect_names = {a["aspect"] for a in aspects}

        # Should detect "price" aspect due to explicit keywords (expensive, overpriced)
        assert "price" in aspect_names, \
            f"Expected 'price' aspect to be detected, got: {aspect_names}"

        price_aspect = next(a for a in aspects if a["aspect"] == "price")
        
        # Should be negative (expensive is a complaint)
        assert price_aspect["sentiment_label"] == "negative", \
            "Price aspect should be negative (expensive mentioned)"

        async with session_factory() as db:
            result = await db.execute(
                select(AspectSentiment)
                .where(AspectSentiment.review_id == review["id"])
                .where(AspectSentiment.aspect == "price")
            )
            persisted_price_aspects = result.scalars().all()

        assert persisted_price_aspects, "Expected persisted price aspect in DB"
        assert all(a.aspect_confidence > 0 for a in persisted_price_aspects)
        assert all(a.sentiment_confidence > 0 for a in persisted_price_aspects)
