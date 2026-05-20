from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

import backend.app.services.auth_service as auth_service
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_models
from backend.app.core.constants import VIBE_UI_MAP
from backend.app.core.ml_registry import MLRegistry
from backend.app.models.confession import Confession
from backend.app.models.user import User

from backend.app.services.analytics.health_score_analytics import compute_business_health
from backend.app.services.analytics.sentiment_analytics import (
    get_sentiment_over_time,
    get_sentiment_distribution,
)
from backend.app.services.analytics.vibe_analytics import (
    get_vibe_score_over_time,
    get_vibe_score_trend,
    get_latest_vibe,
    forecast_vibe_score,
    get_peak_and_drop,
)
from backend.app.services.analytics.aspect_analytics import (
    get_aspect_summary,
    get_aspect_trends,
    get_aspect_frequency,
)
from backend.app.services.analytics.review_analytics import get_review_activity
from backend.app.services.insights_service import get_positive_drivers

# REMOVED: business_service — no business ownership in v2
# REMOVED: review_service — no user-submitted reviews in v2
# REMOVED: get_review_volume_over_time — replaced by confession activity

router = APIRouter()


@router.get("")
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.get_authenticated_user),
    models: MLRegistry = Depends(get_models),
):
    """
    Dashboard endpoint that aggregates all analytics for the admin dashboard in a single call.
    Input source changed from user-submitted reviews to scraped/imported CTU confessions.
    business_id removed — confessions are institution-wide, not per business.
    """

    # ===================
    # Confession Count
    # ===================
    # Replaces review_count — counts only processed confessions (those with sentiment scores)
    confession_count_result = await db.execute(
        select(func.count(Confession.id)).where(
            Confession.sentiment_score.isnot(None)
        )
    )
    confession_count = confession_count_result.scalar() or 0

    # ===================
    # Card Metrics
    # ===================
    # (CARD 1) Vibe Score with trend (stable, improving or declining)
    # business_id removed from all calls — institution-wide
    latest_vibe = await get_latest_vibe(db)
    vibe_score_trend = await get_vibe_score_trend(db)

    # (CARD 2) Confession Count — returned directly from confession_count above

    # (CARD 3) Top Performing Aspect
    aspect_summary = await get_aspect_summary(db)
    aspect_trends = await get_aspect_trends(db)

    # Top Performing Aspect is derived from get_positive_drivers which takes into account
    # both the aspect summary and trends, as well as confession volume, to identify
    # which aspect is currently the strongest driver of positive student sentiment
    positive_drivers = get_positive_drivers(
        aspect_summary=aspect_summary["summary"],
        aspect_trends=aspect_trends["trends"],
        review_count=confession_count,
    )

    # ======================================
    # Campus Wellness Score (was Business Health)
    # ======================================
    business_health = await compute_business_health(
        vibe_score=latest_vibe.get("vibe_score", 0),
        trend=vibe_score_trend.get("trend", "stable"),
        aspects=aspect_summary["summary"],
        review_count=confession_count,
    )

    # =====================================
    # Confession Activity
    # =====================================
    # Detects significant changes in confession volume or sentiment
    # compared to previous periods — same anomaly detection logic, new input source
    review_activity = await get_review_activity(db)

    # ====================================================================
    # Vibe Performance Over Time Line Chart with Peak and Drop Annotations
    # ====================================================================
    vibe_score_daily = await get_vibe_score_over_time(db, "daily")
    vibe_score_weekly = await get_vibe_score_over_time(db, "weekly")
    vibe_score_monthly = await get_vibe_score_over_time(db, "monthly")

    # Peak — Strongest Positive Change in Vibe Score
    # Drop — Strongest Negative Change in Vibe Score
    peak_and_drop = await get_peak_and_drop(db)

    # =====================================
    # Aspect Frequency Share Pie Chart
    # =====================================
    aspect_frequency = await get_aspect_frequency(
        db=db,
        aspects=aspect_summary,
        # business_id removed
    )

    # ====================================
    # Sentiment Distribution Pie Chart
    # =====================================
    sentiment_distribution = await get_sentiment_distribution(db)

    # =====================================
    # Sentiment Over Time Line Chart
    # =====================================
    sentiment_over_time = await get_sentiment_over_time(db, "daily")

    # =====================================
    # Vibe Score Forecast Line Chart
    # =====================================
    forecast_vibe = await forecast_vibe_score(db)

    # =====================================
    # Vibe UI label mapping
    # =====================================
    # Derives the appropriate UI label and color for the vibe card
    label = latest_vibe.get("vibe_label") if latest_vibe else None
    label_key = label.lower() if label else None

    return {
        # profile removed — no business profile in v2
        # latest_reviews removed — will be added as separate confessions endpoint

        "business_health": business_health,
        "confession_count": confession_count,

        "positive_drivers": positive_drivers,
        "vibe": latest_vibe,
        "vibe_ui": VIBE_UI_MAP.get(label_key),
        "vibe_score_trend": vibe_score_trend,

        "peak_and_drop": peak_and_drop,
        "review_activity": review_activity,

        "sentiment_over_time": sentiment_over_time,
        "sentiment_distribution": sentiment_distribution,

        "forecast_vibe": forecast_vibe,

        # Chart data for the Vibe Performance Trend card (7D / 30D / 90D toggle)
        "vibe_chart": {
            "7D": vibe_score_daily["data"],
            "30D": vibe_score_weekly["data"],
            "90D": vibe_score_monthly["data"],
        },

        "aspect_frequency": aspect_frequency,
    }