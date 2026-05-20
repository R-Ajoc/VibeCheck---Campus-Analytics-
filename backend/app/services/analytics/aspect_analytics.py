# This module contains functions to compute aspect-based sentiment analysis summaries and trends for the institution based on student confessions.
# It retrieves aspect sentiment data from the database, computes average scores, trends over time, and frequency distributions for known aspects.

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.constants import (
    ABSA_NEGATIVE_THRESHOLD,
    ABSA_POSITIVE_THRESHOLD,
    MIN_ASPECT_COUNT,
)
from backend.app.core.aspects import ASPECTS
from backend.app.models.aspect_sentiment import AspectSentiment
from backend.app.models.confession import Confession

from backend.app.services.analytics.helpers import reliability

ASPECT_NAME_MAP = {
    "academic_stress": "Academic Stress",
    "administration": "Administration",
    "facilities": "Campus Facilities",
    "faculty_behavior": "Faculty Behavior",
    "student_politics": "Student Politics",
    "mental_health": "Student Mental Health",
    "cost": "Tuition & Costs",
    "services_transit": "Transit & Services",
}

async def get_aspect_summary(db: AsyncSession):
    stmt = (
        select(
            AspectSentiment.aspect,
            func.avg(AspectSentiment.sentiment_score).label("avg_score"),
            func.count(AspectSentiment.id).label("count"),
        )
        .group_by(AspectSentiment.aspect)
    )

    result = await db.execute(stmt)
    rows = result.all()

    if not rows:
        return {
            "summary": {},
            "meta": reliability(0, MIN_ASPECT_COUNT)
        }

    summary = {}
    total_mentions = 0

    for row in rows:
        avg = float(row.avg_score)
        count = int(row.count)
        total_mentions += count

        label = (
            "positive" if avg > ABSA_POSITIVE_THRESHOLD
            else "negative" if avg < ABSA_NEGATIVE_THRESHOLD
            else "neutral"
        )

        # Normalize aspect name — map snake_case to display name
        normalized_name = ASPECT_NAME_MAP.get(row.aspect, row.aspect)

        # If this aspect already exists (duplicate from old data), merge by averaging
        if normalized_name in summary:
            existing = summary[normalized_name]
            merged_count = existing["count"] + count
            merged_avg = (existing["avg_score"] * existing["count"] + avg * count) / merged_count
            merged_label = (
                "positive" if merged_avg > ABSA_POSITIVE_THRESHOLD
                else "negative" if merged_avg < ABSA_NEGATIVE_THRESHOLD
                else "neutral"
            )
            summary[normalized_name] = {
                "avg_score": merged_avg,
                "count": merged_count,
                "label": merged_label
            }
        else:
            summary[normalized_name] = {
                "avg_score": avg,
                "count": count,
                "label": label
            }

    return {
        "summary": summary,
        "meta": reliability(total_mentions, MIN_ASPECT_COUNT)
    }


async def get_aspect_trends(db: AsyncSession):
    # business_id removed — institution-wide
    # Join Confession to get post_date for time bucketing
    stmt = (
        select(
            AspectSentiment.aspect,
            func.strftime("%Y-%m", Confession.post_date).label("period"),
            func.avg(AspectSentiment.sentiment_score).label("avg_score"),
            func.count(AspectSentiment.id).label("count"),
        )
        .join(Confession, AspectSentiment.confession_id == Confession.id)
        # No business_id filter — institution-wide
        .group_by(
            AspectSentiment.aspect,
            func.strftime("%Y-%m", Confession.post_date)
        )
        .order_by(AspectSentiment.aspect, "period")
    )

    result = await db.execute(stmt)
    rows = result.all()

    if not rows:
        return {
            "trends": {},
            "meta": reliability(0, MIN_ASPECT_COUNT)
        }

    grouped = {}
    total_mentions = 0

    # Group results by aspect and compute trends based on score changes over time, 
    # while accumulating total mentions for reliability calculation
    for row in rows:
        aspect = row.aspect
        total_mentions += int(row.count)

        grouped.setdefault(aspect, []).append({
            "period": row.period,
            "avg_score": float(row.avg_score),
            "count": int(row.count)
        })

    # Helper function to determine trend direction based on score changes,
    # with a threshold to filter out insignificant changes
    def compute_trend(points):
        if len(points) < 2:
            return {
                "trend": "stable",
                "change": 0
            }

        points = sorted(points, key=lambda x: x["period"])

        first = points[0]["avg_score"]
        last = points[-1]["avg_score"]
        delta = round(last - first, 2)

        if delta > 0.05:
            trend = "improving"
        elif delta < -0.05:
            trend = "declining"
        else:
            trend = "stable"

        return {
            "trend": trend,
            "change": delta
        }

    trends = {}

    # Apply trend computation to each aspect's time series data and compile results, 
    # along with reliability meta information based on total mentions
    for aspect, points in grouped.items():
        trends[aspect] = {
            "data": points,
            **compute_trend(points)
        }

    return {
        "trends": trends,
        "meta": reliability(total_mentions, MIN_ASPECT_COUNT)
    }


async def get_aspect_frequency(db: AsyncSession, aspects: dict):
    aspect_summary = aspects.get("summary", {}) if isinstance(aspects, dict) else {}

    total_mentions = 0
    frequent_aspects = []

    for aspect_name in ASPECTS.keys():
        # Now summary uses display names directly, so look up by aspect_name
        count = int(aspect_summary.get(aspect_name, {}).get("count", 0))

        frequent_aspects.append({
            "term": aspect_name,
            "count": count
        })
        total_mentions += count

    return {
        "status": "computed" if aspect_summary else "no_data",
        "aspects": frequent_aspects,
        "meta": reliability(sample_size=total_mentions, minimum=1),
    }