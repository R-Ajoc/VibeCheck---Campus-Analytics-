# This module contains functions to compute sentiment analytics for the institution based on student confessions.
# It includes functions to compute sentiment trends over time, distribution of sentiment labels, and volatility of sentiment scores. 
# Each function retrieves relevant review data from the database, performs calculations, and returns results 
import numpy as np
from sqlalchemy import func, select, case
from sqlalchemy.ext.asyncio import AsyncSession
from collections import defaultdict, deque

from backend.app.models.aspect_sentiment import AspectSentiment

from backend.app.core.constants import (
    MIN_SENTIMENT_DISTRIBUTION_REVIEWS,
    MIN_SENTIMENT_TIMESERIES_POINTS,
    MIN_SENTIMENT_TREND_POINTS,
    MIN_SENTIMENT_VOLATILITY_POINTS,
    SENTIMENT_TREND_NEGATIVE_THRESHOLD,
    SENTIMENT_TREND_POSITIVE_THRESHOLD
)

from backend.app.models.confession import Confession
from backend.app.services.mapper_service import map_stability
from backend.app.services.analytics.helpers import reliability

async def get_sentiment_over_time(
    db: AsyncSession,
    granularity: str
    # business_id removed — confessions are institution-wide
):
    if granularity == "daily":
        bucket = func.date(Confession.post_date)
    elif granularity == "weekly":
        bucket = func.strftime("%Y-%W", Confession.post_date)
    elif granularity == "monthly":
        bucket = func.strftime("%Y-%m", Confession.post_date)

    stmt = (
        select(
            bucket.label("period"),
            AspectSentiment.aspect.label("aspect"),
            func.sum(AspectSentiment.sentiment_score * (AspectSentiment.sentiment_confidence * AspectSentiment.aspect_confidence)).label("weighted_sum"),
            func.sum((AspectSentiment.sentiment_confidence * AspectSentiment.aspect_confidence)).label("weight_sum"),
            func.count(AspectSentiment.id).label("count")
        )
        .join(Confession, AspectSentiment.confession_id == Confession.id)
        # No business_id filter — institution-wide
        .group_by("period", "aspect")
        .order_by("period")
    )

    result = await db.execute(stmt)
    rows = result.all()

    # Organize results by period
    periods = []
    period_aspects = defaultdict(list)  # period -> list of aspect dicts
    global_aspect_totals = defaultdict(lambda: {"weighted_sum": 0.0, "weight_sum": 0.0, "count": 0})

    for row in rows:
        period = row.period
        aspect = row.aspect
        wsum = float(row.weighted_sum or 0.0)
        wsum_w = float(row.weight_sum or 0.0)
        cnt = int(row.count or 0)

        if period not in period_aspects:
            periods.append(period)

        period_aspects[period].append({
            "aspect": aspect,
            "weighted_sum": wsum,
            "weight_sum": wsum_w,
            "count": cnt,
        })

        gat = global_aspect_totals[aspect]
        gat["weighted_sum"] += wsum
        gat["weight_sum"] += wsum_w
        gat["count"] += cnt

    # Compute global means per aspect for shrinkage
    global_aspect_mean = {}
    for aspect, totals in global_aspect_totals.items():
        if totals["weight_sum"] > 0:
            global_aspect_mean[aspect] = totals["weighted_sum"] / totals["weight_sum"]
        else:
            global_aspect_mean[aspect] = 0.0

    # Parameters
    bucket_min_reviews = max(1, MIN_SENTIMENT_TIMESERIES_POINTS // 2)  # require at least half of configured points
    shrinkage_k = 5.0  # pseudo-count for shrinkage; higher -> stronger pull to global mean
    rolling_window = 3

    # Build ordered list of buckets with computed values
    ordered_periods = sorted(periods)
    bucket_series = []

    for period in ordered_periods:
        aspects_list = period_aspects.get(period, [])

        # compute per-aspect averages and total weight
        aspect_outputs = []
        total_weighted = 0.0
        total_weight = 0.0
        total_count = 0

        for a in aspects_list:
            weight_sum = a["weight_sum"]
            if weight_sum > 0:
                raw_avg = a["weighted_sum"] / weight_sum
            else:
                raw_avg = 0.0

            # shrink toward global mean for this aspect
            global_mean = global_aspect_mean.get(a["aspect"], 0.0)
            n = a["count"]
            shrunk = (n / (n + shrinkage_k)) * raw_avg + (shrinkage_k / (n + shrinkage_k)) * global_mean

            aspect_outputs.append({
                "aspect": a["aspect"],
                "avg_score": float(shrunk),
                "count": a["count"],
                "weight_sum": float(weight_sum),
            })

            total_weighted += shrunk * (a["weight_sum"] or 0)
            total_weight += (a["weight_sum"] or 0)
            total_count += a["count"]

        # overall bucket score (weighted by aspect weight sums)
        if total_weight > 0:
            bucket_avg = total_weighted / total_weight
        else:
            bucket_avg = 0.0

        is_reliable = total_count >= bucket_min_reviews

        bucket_series.append({
            "period": period,
            "avg_score": float(bucket_avg),
            "review_count_per_period": total_count,
            "is_reliable": is_reliable,
            "aspects": aspect_outputs,
        })

    # Apply optional rolling mean smoothing to overall avg_score
    smoothed = []
    dq = deque()
    for b in bucket_series:
        dq.append(b["avg_score"])
        if len(dq) > rolling_window:
            dq.popleft()
        smoothed_avg = float(sum(dq) / len(dq))
        smoothed.append({**b, "smoothed_avg_score": smoothed_avg})

    # Mark low-confidence buckets (insufficient data) – if not reliable we set avg_score to None or keep but flag
    for b in smoothed:
        if not b["is_reliable"]:
            b["confidence"] = "low"
        else:
            b["confidence"] = "high"

    return {
        "data": smoothed,
        "meta": reliability(len(smoothed), MIN_SENTIMENT_TIMESERIES_POINTS)
    }


async def get_sentiment_distribution(db: AsyncSession):
    """
    Aggregates confessions into sentiment buckets based on their numerical score.
    Positive: > 0.2
    Negative: < -0.2
    Neutral: Between -0.2 and 0.2
    """
    stmt = select(
        func.count(case((Confession.sentiment_score > 0.2, 1))).label("positive"),
        func.count(case((Confession.sentiment_score < -0.2, 1))).label("negative"),
        func.count(case((Confession.sentiment_score.between(-0.2, 0.2), 1))).label("neutral")
    ).where(Confession.sentiment_score.isnot(None))

    result = await db.execute(stmt)
    row = result.fetchone()

    if not row:
        return {"positive": 0, "negative": 0, "neutral": 0}

    return {
        "positive": row.positive or 0,
        "negative": row.negative or 0,
        "neutral": row.neutral or 0
    }


async def get_sentiment_trend_slope(db: AsyncSession):
    # business_id removed — institution-wide
    stmt = (
        select(
            func.date(Confession.post_date).label("date"),
            func.avg(Confession.sentiment_score).label("avg_score")
        )
        .where(Confession.sentiment_score.isnot(None))
        .group_by(func.date(Confession.post_date))
        .order_by(func.date(Confession.post_date))
    )

    result = await db.execute(stmt)
    rows = result.all()

    # Reliability check (prevents noisy / invalid regression)
    is_reliable = len(rows) >= MIN_SENTIMENT_TREND_POINTS

    if not is_reliable:
        return {
            "trend": "insufficient_data",
            "slope": 0.0,
            "meta": reliability(len(rows), MIN_SENTIMENT_TREND_POINTS)
        }

    # Prepare regression data
    x = np.arange(len(rows))
    y = np.array([r.avg_score for r in rows])

    # Linear regression slope
    slope = np.polyfit(x, y, 1)[0]

    # Interpret trend
    trend = (
        "improving" if slope > SENTIMENT_TREND_POSITIVE_THRESHOLD
        else "declining" if slope < SENTIMENT_TREND_NEGATIVE_THRESHOLD
        else "stable"
    )

    return {
        "trend": trend,
        "slope": float(slope),
        "meta": reliability(len(rows), MIN_SENTIMENT_TREND_POINTS)
    }


async def get_sentiment_volatility(db: AsyncSession):
    # business_id removed — institution-wide
    stmt = select(Confession.sentiment_score).where(
        Confession.sentiment_score.isnot(None)
    )

    result = await db.execute(stmt)
    scores = [r[0] for r in result if r[0] is not None]

    total_points = len(scores)

    # reliability guard (don't report volatility if we have very few reviews, as it would be noisy and unreliable)
    if total_points < MIN_SENTIMENT_VOLATILITY_POINTS:
        return {
            "volatility": 0.0,
            "stability": "insufficient_data",
            "interpretation": map_stability(0.0, "sentiment_volatility", 0)["message"],
            "meta": reliability(
                total_points,
                MIN_SENTIMENT_VOLATILITY_POINTS
            )
        }

    # Standard deviation of sentiment scores as volatility measure
    volatility = float(np.std(scores))

    # map raw volatility to stability label and interpretation message
    mapped = map_stability(
        volatility=volatility,
        metric="sentiment_volatility",
        data_points=total_points
    )

    return {
        "volatility": volatility,
        "stability": mapped["label"],
        "interpretation": mapped["message"],
        "meta": reliability(
            total_points,
            MIN_SENTIMENT_VOLATILITY_POINTS
        )
    }
