# This module contains functions to analyze confession data and detect significant shifts in student sentiment.
# It combines both sentiment and volume signals to identify potential events impacting student experience,

import numpy as np
import pandas as pd
from datetime import UTC, datetime, timedelta
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.constants import (
        CONFIDENCE_SENTIMENT_WEIGHT,
        CONFIDENCE_VOLUME_WEIGHT,
        MIN_SPIKE_DATA_POINTS,
    MIN_REVIEW_VOLUME_POINTS,
    MIN_REVIEW_VELOCITY_POINTS,
        Z_SCORE_SENTIMENT_THRESHOLD,
        Z_SCORE_VOLUME_THRESHOLD,
)
from backend.app.models.confession import Confession
from backend.app.services.analytics.helpers import reliability


def map_urgency(event_type: str, confidence: float):
    """
    Maps detected event types and confidence levels to an urgency category 
    for business action prioritization.
    """
    if event_type == "no_anomaly":
        return "low"
    if event_type == "emerging_event":
        return "low_medium"
    if event_type == "activity_event":
        return "medium"
    if event_type == "sentiment_event":
        return "medium_high"
    if event_type == "true_event":
        return "high"
    return "unknown"


def stable_z(series):
    """ 
    Z-score calculation with stability adjustments to prevent extreme values when variance is low.
    This helps ensure that our event detection is not overly sensitive to small fluctuations
    when data is limited or when sentiment/volume is very stable.
    """
    std = np.std(series)
    if std == 0:
        std = 1.0
    return (series - np.mean(series)) / std


async def get_review_volume_over_time(
    db: AsyncSession,
    business_id: int,
    granularity: str,
):
    """
    Aggregates review counts over time for a business, grouped by the specified
    granularity (daily, weekly, monthly).
    """
    if granularity == "daily":
        bucket = func.date(Confession.post_date)
    elif granularity == "weekly":
        bucket = func.strftime("%Y-%W", Confession.post_date)
    elif granularity == "monthly":
        bucket = func.strftime("%Y-%m", Confession.post_date)

    stmt = (
        select(
            bucket.label("period"),
            func.count(Confession.id).label("review_count"),
        )
        # No business_id filter — confessions are institution-wide
        .group_by(bucket)
        .order_by(bucket)
    )

    result = await db.execute(stmt)
    rows = result.all()

    return {
        "data": [
            {
                "period": row.period,
                "review_count": int(row.review_count or 0),
            }
            for row in rows
        ],
        "meta": reliability(len(rows), MIN_REVIEW_VOLUME_POINTS),
    }


async def get_review_activity(db: AsyncSession, business_id: int = None):
    """
    Detects significant shifts in customer experience by analyzing daily sentiment and review volume.
    Combines both sentiment and volume signals to identify potential events impacting customer experience.
        
    Returns an event type: 
    - true_event (significant change in both sentiment and volume, likely indicating a real issue),
    - sentiment_event (change in sentiment only),
    - activity_event (change in review volume only),
    - emerging_event (potential issue based on trends),
    - no_anomaly (no significant changes detected) along with confidence level and interpretation.
    """

    # Fetch daily aggregated sentiment and volume data for the business, 
    # grouped by date and weekday to allow for seasonality adjustments
    stmt = (
        select(
            func.date(Confession.post_date).label("date"),
            func.avg(Confession.sentiment_score).label("avg_sentiment"),
            func.count(Confession.id).label("count"),
            func.extract("dow", Confession.post_date).label("weekday")
        )
        # No business_id filter — confessions are institution-wide
        .group_by(func.date(Confession.post_date), func.extract("dow", Confession.post_date))
        .order_by(func.date(Confession.post_date))
    )

    result = await db.execute(stmt)
    rows = result.all()

    if len(rows) < MIN_SPIKE_DATA_POINTS:
        return {
            "event_type": "insufficient_data",
            "confidence": 0,
            "interpretation": "Not enough customer reviews yet to detect meaningful changes.",
            "meta": reliability(len(rows), MIN_SPIKE_DATA_POINTS)
        }

    df = pd.DataFrame(rows, columns=["date", "sentiment", "volume", "weekday"])

    # Replace missing sentiment or volume values with sensible defaults
    # so downstream numeric operations (rolling, z-score) do not fail.
    df["sentiment"] = df["sentiment"].fillna(0.0)
    df["volume"] = df["volume"].fillna(0)


    # Seasonality adjustment: Remove average weekday effects to focus on underlying changes
    weekday_baseline_sentiment = df.groupby("weekday")["sentiment"].mean()
    weekday_baseline_volume = df.groupby("weekday")["volume"].mean()

    # Safe subtraction that tolerates missing values in the row or baseline
    df["sentiment_deseasonalized"] = df.apply(
        lambda r: (
            (0.0 if pd.isna(r["sentiment"]) else float(r["sentiment"]))
            - float(weekday_baseline_sentiment.get(r["weekday"], 0.0))
        ),
        axis=1,
    )

    df["volume_deseasonalized"] = df.apply(
        lambda r: (
            (0 if pd.isna(r["volume"]) else int(r["volume"]))
            - int(weekday_baseline_volume.get(r["weekday"], 0))
        ),
        axis=1,
    )

    # Trend adjustment: Remove longer-term trends using rolling average to focus on recent shifts
    df["sentiment_trend"] = df["sentiment_deseasonalized"].rolling(7, min_periods=3).mean()
    df["volume_trend"] = df["volume_deseasonalized"].rolling(7, min_periods=3).mean()

    df["sentiment_trend"] = df["sentiment_trend"].fillna(
        df["sentiment_deseasonalized"].mean()
    )
    df["volume_trend"] = df["volume_trend"].fillna(
        df["volume_deseasonalized"].mean()
    )

    # Residual calculation: Focus on deviations from normal behavior after removing seasonality and trends
    df["sentiment_residual"] = df["sentiment_deseasonalized"] - df["sentiment_trend"]
    df["volume_residual"] = df["volume_deseasonalized"] - df["volume_trend"]

    # Z-score calculation with stability adjustments to identify significant deviations in sentiment and volume
    sentiment_z = stable_z(df["sentiment_residual"])
    volume_z = stable_z(df["volume_residual"])

    latest_sentiment_z = sentiment_z.iloc[-1]
    latest_volume_z = volume_z.iloc[-1]

    # Event classification based on combined sentiment and volume signals, with confidence weighting to reflect strength of signals and data reliability
    sentiment_spike = abs(latest_sentiment_z) > Z_SCORE_SENTIMENT_THRESHOLD
    volume_spike = abs(latest_volume_z) > Z_SCORE_VOLUME_THRESHOLD

    if sentiment_spike and volume_spike:
        event_type = "true_event"
        interpretation = (
            "There is a clear shift in customer experience, "
            "with changes in both sentiment and review activity. "
            "This likely reflects a real operational or customer-facing issue."
        )

    elif sentiment_spike:
        event_type = "sentiment_event"
        interpretation = (
            "Customers are expressing noticeably different opinions than usual, "
            "even though review activity remains normal."
        )

    elif volume_spike:
        event_type = "activity_event"
        interpretation = (
            "There is unusual review activity compared to normal patterns, "
            "but customer sentiment has not changed significantly."
        )

    elif abs(latest_sentiment_z) > 1.5 or abs(latest_volume_z) > 1.5:
        event_type = "emerging_event"
        interpretation = (
            "Early signs of change detected in customer feedback. "
            "This may indicate a developing issue worth monitoring."
        )

    else:
        event_type = "no_anomaly"
        interpretation = (
            "Customer experience is stable with no unusual changes detected."
        )

    # Confidence calculation based on strength of signals and data reliability, with weighting to reflect importance of sentiment and volume changes and adjustments for data quality
    confidence_raw = (
        min(abs(latest_sentiment_z), 3) * CONFIDENCE_SENTIMENT_WEIGHT +
        min(abs(latest_volume_z), 3) * CONFIDENCE_VOLUME_WEIGHT
    )

    confidence = int(min(100, confidence_raw * 25))
    confidence *= min(len(rows) / MIN_SPIKE_DATA_POINTS, 1.0)
    confidence = int(confidence)

    return {
        "event_type": event_type,
        "confidence": confidence,
        "z_scores": {
            "sentiment_z": float(latest_sentiment_z),
            "volume_z": float(latest_volume_z)
        },
        "baseline": {
            "note": "Compared against normal weekly behavior and recent trends"
        },
        "interpretation": interpretation,
        "meta": reliability(len(rows), MIN_SPIKE_DATA_POINTS),
        "urgency": map_urgency(event_type, confidence)
    }

