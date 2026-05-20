import datetime
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from transformers import pipeline
from sentence_transformers import SentenceTransformer

from backend.app.core.database import AsyncSessionLocal
from backend.app.core.ml_registry import MLRegistry
from backend.app.core.aspects import ASPECTS
from backend.app.services.vibe_snapshot_service import create_vibe_snapshot

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def run_vibe_snapshot_job():
    logger.info("VibeSnapshot Job START")

    try:
        sentiment_model = pipeline(
            "sentiment-analysis",
            model="distilbert-base-uncased-finetuned-sst-2-english"
        )
        embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
        aspect_texts = list(ASPECTS.values())
        aspect_embeddings = embedding_model.encode(aspect_texts, convert_to_tensor=True)
        models = MLRegistry(
            sentiment=sentiment_model,
            embedding=embedding_model,
            aspect_embeddings=aspect_embeddings,
            keyword_extractor=None,
            large_language_model=None,
        )

        async with AsyncSessionLocal() as db:
            now = datetime.datetime.now(datetime.timezone.utc)
            await create_vibe_snapshot(db, models, now, use_ai_summary=False)
            await db.commit()

        logger.info("VibeSnapshot Job FINISHED")

    except Exception as e:
        logger.exception(f"VibeSnapshot Job FAILED: {e}")