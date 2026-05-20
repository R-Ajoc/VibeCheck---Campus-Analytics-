# # conftest.py - runs before all tests to ensure models are registered
# from keybert import KeyBERT
# import pytest  # noqa: F401
# import pytest_asyncio
# from httpx import AsyncClient, ASGITransport

# import backend.app.models  # Import all models to register them with Base  # noqa: F401
# from backend.app.main import app
# from backend.app.core.database import get_db, Base
# from backend.app.core.ml_registry import MLRegistry
# from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
# from transformers import pipeline
# from sentence_transformers import SentenceTransformer

# from backend.app.core.aspects import ASPECTS

# TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# engine = create_async_engine(
#     TEST_DATABASE_URL,
#     connect_args={"check_same_thread": False},
# )

# TestingSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


# # Override DB dependency
# async def override_get_db():
#     async with TestingSessionLocal() as session:
#         yield session


# app.dependency_overrides[get_db] = override_get_db


# # Setup / teardown DB - shared across all tests
# @pytest_asyncio.fixture(scope="session", autouse=True)
# async def setup_db():
#     async with engine.begin() as conn:
#         await conn.run_sync(Base.metadata.create_all)
#     yield
#     async with engine.begin() as conn:
#         await conn.run_sync(Base.metadata.drop_all)


# # Clear database between tests
# @pytest_asyncio.fixture(autouse=True)
# async def clear_db():
#     """Clear all tables before each test"""
#     # Import models to get access to table references
#     from backend.app.models.aspect_sentiment import AspectSentiment
#     from backend.app.models.business import Business
#     from backend.app.models.review import Review
#     from backend.app.models.user import User
#     from backend.app.models.vibe_snapshot import VibeSnapshot
    
#     async with engine.begin() as conn:
#         # Delete in order to respect foreign key constraints
#         await conn.execute(AspectSentiment.__table__.delete())
#         await conn.execute(VibeSnapshot.__table__.delete())
#         await conn.execute(Review.__table__.delete())
#         await conn.execute(Business.__table__.delete())
#         await conn.execute(User.__table__.delete())
    
#     yield
    
#     # Cleanup after test
#     async with engine.begin() as conn:
#         await conn.execute(AspectSentiment.__table__.delete())
#         await conn.execute(VibeSnapshot.__table__.delete())
#         await conn.execute(Review.__table__.delete())
#         await conn.execute(Business.__table__.delete())
#         await conn.execute(User.__table__.delete())


# # Initialize ML models for tests - shared across all tests
# @pytest_asyncio.fixture(scope="session", autouse=True)
# async def setup_models():
#     """Load ML models once for the entire test session"""
#     sentiment_model = pipeline(
#         "sentiment-analysis",
#         model="distilbert-base-uncased-finetuned-sst-2-english"
#     )
    
#     embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    
#     # pre-compute aspect embeddings
#     aspect_texts = list(ASPECTS.values())
#     aspect_embeddings = embedding_model.encode(
#         aspect_texts,
#         convert_to_tensor=True
#     )
    
#     keyword_extractor_model = KeyBERT(model=embedding_model)
#     app.state.models = MLRegistry(
#         sentiment=sentiment_model,
#         embedding=embedding_model,
#         aspect_embeddings=aspect_embeddings,
#         keyword_extractor=keyword_extractor_model
#     )
    
#     yield
    
#     # Cleanup if needed


# # Async client - shared across all tests
# @pytest_asyncio.fixture
# async def client():
#     transport = ASGITransport(app=app)
#     async with AsyncClient(transport=transport, base_url="http://test") as ac:
#         yield ac


# # Helper to create a user with password (required for auth)
# async def create_test_user(client, username="testuser", firstname="Test", lastname="User", password="password123"):
#     """Helper function to create a user for tests"""
#     response = await client.post("/api/users", json={
#         "username": username,
#         "firstname": firstname,
#         "lastname": lastname,
#         "password": password
#     })
#     return response


# # Helper to login and get auth header
# async def login_and_get_header(client, username="testuser", password="password123"):
#     """Helper function to login and return Authorization header"""
#     response = await client.post("/api/auth/login", json={
#         "username": username,
#         "password": password
#     })
#     token = response.json().get("access_token")
#     return {"Authorization": f"Bearer {token}"}
