# This module contains functions to analyze vibe scores for the institution, including:
# Retrieving latest vibe snapshot
#   - (A vibe snapshot is a summary of the overall student sentiment
#   - at a specific point in time)
# Calculating vibe score volatility
# Generating vibe score time series
# Identifying peaks and drops in vibe scores
# Calculating vibe score trend using linear regression slope
# Forecasting future vibe scores using linear regression on historical data

import numpy as np
from sklearn.linear_model import LinearRegression
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.constants import (
    FUTURE_FORECAST_MONTHS,
    MAX_VIBE_SCORE,
    MIN_PEAK_DROP_POINTS,
    MIN_VIBE_FORECAST_POINTS,
    MIN_VIBE_SCORE,
    MIN_VIBE_TIMESERIES_POINTS,
    MIN_VIBE_TREND_POINTS,
    MIN_VIBE_VOLATILITY_POINTS,
    VIBE_TREND_NEGATIVE_SLOPE_THRESHOLD,
    VIBE_TREND_POSITIVE_SLOPE_THRESHOLD,
)
from backend.app.models.vibe_snapshot import VibeSnapshot
from backend.app.services.analytics.helpers import reliability
from backend.app.services.mapper_service import (
    map_peak_drop_event,
    map_stability,
    map_vibe_score,
)


async def get_latest_vibe(db: AsyncSession):
    """
    Retrieve the latest vibe snapshot for the institution.
    business_id removed — institution-wide, single snapshot series.
    """
    stmt = (
        select(VibeSnapshot)
        .order_by(VibeSnapshot.snapshot_date.desc())
        .limit(1)
    )

    result = await db.execute(stmt)
    row = result.scalar_one_or_none()

    if not row:
        return {"status": "no_data"}

    return {
        "vibe_score": row.vibe_score,
        "vibe_label": row.vibe_label,
        "confessions_analyzed": row.review_count,
        "date": row.snapshot_date,
    }


async def get_vibe_volatility(db: AsyncSession):
    """
    Measures stability of vibe scores using standard deviation of historical snapshots.
    business_id removed — institution-wide.
    """
    # No business_id filter — query all institution snapshots
    stmt = select(VibeSnapshot.vibe_score)

    result = await db.execute(stmt)
    rows = result.all()

    scores = [r[0] for r in rows if r[0] is not None]
    total_points = len(scores)

    # reliability guard — don't report volatility with very few snapshots
    if total_points < MIN_VIBE_VOLATILITY_POINTS:
        return {
            "volatility": 0.0,
            "stability": "insufficient_data",
            "interpretation": map_stability(0.0, "vibe_volatility", 0)["message"],
            "meta": reliability(total_points, MIN_VIBE_VOLATILITY_POINTS),
        }

    # Standard deviation of vibe scores as volatility measure
    volatility = float(np.std(scores))

    mapped = map_stability(
        volatility=volatility,
        metric="vibe_volatility",
        data_points=total_points,
    )

    return {
        "volatility": volatility,
        "stability": mapped["label"],
        "interpretation": mapped["message"],
        "meta": reliability(total_points, MIN_VIBE_VOLATILITY_POINTS),
    }


async def get_vibe_score_time_series(db: AsyncSession, granularity: str):
    """
    Retrieves vibe score time series for the institution,
    aggregated by the specified granularity (daily, weekly, monthly).
    business_id removed — institution-wide.
    """
    if granularity == "daily":
        bucket = func.date(VibeSnapshot.snapshot_date)
    elif granularity == "weekly":
        bucket = func.strftime("%Y-%W", VibeSnapshot.snapshot_date)
    elif granularity == "monthly":
        bucket = func.strftime("%Y-%m", VibeSnapshot.snapshot_date)
    else:
        raise ValueError("Invalid granularity")

    stmt = (
        select(
            bucket.label("period"),
            func.avg(VibeSnapshot.vibe_score).label("avg_score"),
            func.count(VibeSnapshot.id).label("snapshot_count"),
        )
        # No business_id filter — institution-wide
        .group_by("period")
        .order_by("period")
    )

    result = await db.execute(stmt)
    rows = result.all()

    return [
        {
            "period": r.period,
            "avg_score": float(r.avg_score or 0),
            "snapshot_count": int(r.snapshot_count),
        }
        for r in rows
    ]


async def get_vibe_score_over_time(db: AsyncSession, granularity: str):
    """
    Returns vibe score time series with reliability metadata.
    business_id removed — institution-wide.
    """
    data = await get_vibe_score_time_series(db, granularity)

    return {
        "data": data,
        "meta": reliability(len(data), MIN_VIBE_TIMESERIES_POINTS),
    }


async def get_peak_and_drop(db: AsyncSession):
    """
    Identifies the biggest peak and drop in vibe scores over time.
    Peak: largest positive change between consecutive time periods.
    Drop: largest negative change between consecutive time periods.
    business_id removed — institution-wide.
    """
    rows = await get_vibe_score_time_series(db, "daily")

    if len(rows) < MIN_PEAK_DROP_POINTS:
        return {
            "peak": None,
            "drop": None,
            "meta": reliability(len(rows), MIN_PEAK_DROP_POINTS),
        }

    diffs = []

    for i in range(1, len(rows)):
        prev_score = float(rows[i - 1]["avg_score"] or 0)
        curr_score = float(rows[i]["avg_score"] or 0)

        diffs.append({
            "date": rows[i]["period"],
            "change": round(curr_score - prev_score, 4),
            "previous_score": round(prev_score, 4),
            "current_score": round(curr_score, 4),
            "snapshot_count": int(rows[i].get("snapshot_count", 0)),
        })

    peak = max(diffs, key=lambda x: x["change"])
    drop = min(diffs, key=lambda x: x["change"])

    return {
        "peak": map_peak_drop_event(peak, "peak"),
        "drop": map_peak_drop_event(drop, "drop"),
        "meta": reliability(len(rows), MIN_PEAK_DROP_POINTS),
    }


async def get_vibe_score_trend(db: AsyncSession):
    """
    Calculates the trend of vibe scores over time using linear regression slope.
    Returns trend classification (improving/declining/stable) and slope value.
    business_id removed — institution-wide.
    """
    stmt = (
        select(VibeSnapshot.snapshot_date, VibeSnapshot.vibe_score)
        # No business_id filter — institution-wide
        .order_by(VibeSnapshot.snapshot_date)
    )

    result = await db.execute(stmt)
    rows = result.all()

    # SAFETY CHECK 1: If there are fewer than 2 distinct historical points, return stable/insufficient early
    if len(rows) < 2 or len(rows) < MIN_VIBE_TREND_POINTS:
        return {
            "trend": "stable",
            "slope": 0.0,
            "change": 0.0,  # Added to ensure the dashboard's key references don't complain
            "meta": reliability(len(rows), max(2, MIN_VIBE_TREND_POINTS)),
        }

    base_date = rows[0].snapshot_date

    x = np.array([
        (r.snapshot_date - base_date).days
        for r in rows
    ])

    y = np.array([r.vibe_score for r in rows])

    # SAFETY CHECK 2: If all snapshots happened on the exact same day, x will be [0, 0, 0...]. 
    # Linear regression cannot divide by zero variance.
    if np.all(x == x[0]):
        return {
            "trend": "stable",
            "slope": 0.0,
            "change": 0.0,
            "meta": reliability(len(rows), MIN_VIBE_TREND_POINTS),
        }

    # SAFETY CHECK 3: Wrap the polyfit call in a try/except block to catch any unexpected math anomalies
    try:
        slope = np.polyfit(x, y, 1)[0]
        
        if slope > VIBE_TREND_POSITIVE_SLOPE_THRESHOLD:
            trend = "improving"
        elif slope < VIBE_TREND_NEGATIVE_SLOPE_THRESHOLD:
            trend = "declining"
        else:
            trend = "stable"
    except Exception:
        trend = "stable"
        slope = 0.0

    return {
        "trend": trend,
        "slope": float(slope),
        "change": float(slope),  # Mirroring change to keep frontend mapping happy
        "meta": reliability(len(rows), MIN_VIBE_TREND_POINTS),
    }


async def forecast_vibe_score(db: AsyncSession):
    """
    Forecast future vibe score using linear regression on historical monthly vibe scores.
    Returns historical trend, 6-month forecast, and predicted vibe classification.
    business_id removed — institution-wide.
    """
    response = await get_vibe_score_over_time(db, "monthly")
    data = response.get("data", [])

    if len(data) < MIN_VIBE_FORECAST_POINTS:
        return {
            "status": "insufficient_data",
            "history": data,
            "forecast": [],
            "meta": reliability(len(data), MIN_VIBE_FORECAST_POINTS),
        }

    y = np.array([item["avg_score"] for item in data])
    x = np.arange(len(y)).reshape(-1, 1)

    model = LinearRegression()
    model.fit(x, y)

    future_x = np.arange(
        len(y),
        len(y) + FUTURE_FORECAST_MONTHS,
    ).reshape(-1, 1)

    future_y = model.predict(future_x)
    future_y = np.clip(future_y, MIN_VIBE_SCORE, MAX_VIBE_SCORE)

    forecast = [
        {
            "period": len(y) + i,
            "predicted": float(score),
        }
        for i, score in enumerate(future_y)
    ]

    final_prediction = float(future_y[-1])
    predicted_vibe = map_vibe_score(final_prediction)

    return {
        "history": data,
        "forecast": forecast,
        "forecast_score": final_prediction,
        "predicted_vibe": predicted_vibe,
        "forecast_months": FUTURE_FORECAST_MONTHS,
        "meta": reliability(len(data), MIN_VIBE_FORECAST_POINTS),
    }