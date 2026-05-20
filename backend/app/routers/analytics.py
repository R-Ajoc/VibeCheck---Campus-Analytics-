from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

import backend.app.services.auth_service as auth_service
from backend.app.core.database import get_db
from backend.app.models.confession import Confession
from backend.app.models.user import User
from backend.app.services import insights_service

from backend.app.services.analytics.aspect_analytics import (
    get_aspect_summary,
    get_aspect_trends,
    get_aspect_frequency,
)
from backend.app.services.analytics.health_score_analytics import (
    compute_business_health,
)
from backend.app.services.analytics.sentiment_analytics import (
    get_sentiment_volatility,
    get_sentiment_distribution,
)
from backend.app.services.analytics.review_analytics import (get_review_activity)

router = APIRouter()


@router.get("")
async def get_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.get_authenticated_user),
):
    """
    Main analytics endpoint that aggregates institutional insights for university administration.
    """

    # ===================
    # Confession Count
    # ===================
    confession_count_result = await db.execute(
        select(func.count(Confession.id)).where(
            Confession.sentiment_score.isnot(None)
        )
    )
    confession_count = confession_count_result.scalar() or 0

    # =====================================
    # Sentiment Volatility (Mood Stability)
    # =====================================
    sentiment_volatility = await get_sentiment_volatility(db)

    # =====================================
    # Aspect Health Summary with Trends
    # =====================================
    aspect_summary = await get_aspect_summary(db)
    aspect_trends = await get_aspect_trends(db)

    # =====================================
    # Aspect Frequency Bar Chart
    # =====================================
    aspect_frequency = await get_aspect_frequency(
        db=db,
        aspects=aspect_summary,
    )

    aspects = [
        {
            "name": aspect_name,
            "score": aspect_data["avg_score"],
            "label": aspect_data["label"],
            "trend": aspect_trends["trends"]
            .get(aspect_name, {})
            .get("trend", "stable"),
            "change": aspect_trends["trends"]
            .get(aspect_name, {})
            .get("change", 0),
        }
        for aspect_name, aspect_data in aspect_summary["summary"].items()
    ]

    # =================================
    # Primary Risk Driver Insight
    # =================================
    primary_risk_driver = insights_service.get_primary_risk_driver(
        aspect_summary=aspect_summary["summary"],
        aspect_trends=aspect_trends["trends"],
        review_count=confession_count,
    )

    # ================================
    # Positive Drivers Insight
    # ================================
    positive_drivers = insights_service.get_positive_drivers(
        aspect_summary=aspect_summary["summary"],
        aspect_trends=aspect_trends["trends"],
        review_count=confession_count,
    )

    # =================================
    # Negative Signals Insight
    # =================================
    review_activity = await get_review_activity(db)

    # Pass dummy dict for vibe_trend parameter to preserve signature without breaking underlying helper models
    negative_signals = insights_service.get_negative_signals(
        aspect_summary=aspect_summary["summary"],
        aspect_trends=aspect_trends["trends"],
        vibe_trend={"trend": "stable", "slope": 0.0},
        sentiment_volatility=sentiment_volatility,
        event_detection=review_activity,
    )

    # =====================================
    # Academic Health & Wellness Index
    # =====================================
    raw_health = await compute_business_health(
        vibe_score=0.0,  # Neutral default baseline
        trend="stable",
        aspects=aspect_summary["summary"],
        review_count=confession_count,
    )

    # =====================================
    # Sentiment Distribution
    # =====================================
    raw_sentiment = await get_sentiment_distribution(db) or {}

    sentiment_distribution = {
        "positive": int(raw_sentiment.get("positive", 0) or 0),
        "negative": int(raw_sentiment.get("negative", 0) or 0),
        "neutral": int(raw_sentiment.get("neutral", 0) or 0),
    }

    # =====================================
    # NEW: Sentiment Velocity & Consensus
    # =====================================
    from datetime import datetime, timedelta
    from sqlalchemy import desc
    from backend.app.models.aspect_sentiment import AspectSentiment

    # Consensus: Fetch recent scores
    scores_stmt = select(AspectSentiment.sentiment_score).order_by(desc(AspectSentiment.id)).limit(50)
    scores_result = await db.execute(scores_stmt)
    raw_scores = [float(s) for s in scores_result.scalars().all()]
    consensus_score = insights_service.get_consensus_score(raw_scores)

    # Velocity: Fetch averages
    res_24h = await db.execute(
        select(func.avg(Confession.sentiment_score))
        .where(Confession.post_date >= datetime.utcnow() - timedelta(hours=24))
    )
    avg_24h = float(res_24h.scalar() or 0.5)

    res_7d = await db.execute(
        select(func.avg(Confession.sentiment_score))
        .where(Confession.post_date >= datetime.utcnow() - timedelta(days=7))
    )
    avg_7d = float(res_7d.scalar() or 0.5)
    
    sentiment_velocity = insights_service.get_sentiment_velocity(avg_24h, avg_7d)

    return {
        "confession_count": confession_count,
        "academic_health_index": raw_health,
        "primary_risk_driver": primary_risk_driver,
        "negative_signals": negative_signals,
        "positive_drivers": positive_drivers,
        "aspect_frequency": aspect_frequency,
        "sentiment_distribution": sentiment_distribution,
        "sentiment_volatility": sentiment_volatility,
        "sentiment_velocity": sentiment_velocity, # Added
        "consensus_score": consensus_score, # Added
        "aspects": aspects,
    }

