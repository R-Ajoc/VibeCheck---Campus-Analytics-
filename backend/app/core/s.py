# This module contains functions to compute sentiment analytics for a business based on its reviews.
# It includes functions to compute sentiment trends over time, distribution of sentiment labels, and volatility of sentiment scores. 
# Each function retrieves relevant review data from the database, performs calculations, and returns results 
import numpy as np
from sqlalchemy import func, select
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

from backend.app.models.review import Review
from backend.app.services.mapper_service import map_stability
from backend.app.services.analytics.helpers import reliability

async def get_sentiment_over_time(
    db: AsyncSession,
    business_id: int,
    granularity: str
):
    """
    Aggregates average sentiment score and review count over time for a business,
    grouped by the specified granularity (daily, weekly, monthly). This provides    
    """
    if granularity == "daily":
        bucket = func.date(Review.created_at)

    elif granularity == "weekly":
        bucket = func.strftime("%Y-%W", Review.created_at)

    elif granularity == "monthly":
        bucket = func.strftime("%Y-%m", Review.created_at)

    else:
        raise ValueError("Invalid granularity")

    # ---------------------------
    # Strategy
    # 1. Aggregate aspect-level sentiment per bucket using weighted averages
    #    (weights = sentiment_confidence * aspect_confidence)
    # 2. Compute bucket-level overall weighted average from aspect totals
    # 3. Require a minimum number of review points per bucket before treating it as reliable
    # 4. Apply a simple shrinkage toward the global mean for small buckets
    # 5. Optionally apply a rolling mean (3 buckets) to smooth volatility
    # ---------------------------

    # Aggregation SQL: per-bucket, per-aspect weighted sums
    stmt = (
        select(
            bucket.label("period"),
            AspectSentiment.aspect.label("aspect"),
            func.sum(AspectSentiment.sentiment_score * (AspectSentiment.sentiment_confidence * AspectSentiment.aspect_confidence)).label("weighted_sum"),
            func.sum((AspectSentiment.sentiment_confidence * AspectSentiment.aspect_confidence)).label("weight_sum"),
            func.count(AspectSentiment.id).label("count")
        )
        .join(Review, AspectSentiment.review_id == Review.id)
        .where(Review.business_id == business_id)
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


async def get_sentiment_distribution(db: AsyncSession, business_id: int):
    """
    Calculates the distribution of sentiment labels for a given business.
    Returns the count and percentage of positive, negative, and neutral reviews, along with a reliability meta.
    """

    # Aggregate count of reviews by sentiment label
    stmt = (
        select(
            Review.sentiment_label,
            func.count(Review.id).label("count")
        )
        .where(Review.business_id == business_id)
        .group_by(Review.sentiment_label)
    )

    result = await db.execute(stmt)

    counts = {"positive": 0, "negative": 0, "neutral": 0}

    total_reviews = 0

    # Calculate total reviews and counts for each sentiment label
    for row in result:
        label = row.sentiment_label or "neutral"
        counts[label] = counts.get(label, 0) + row.count
        total_reviews += row.count

    distribution_with_percentage = {}

    # Calculate percentage for each sentiment label 
    for label, count in counts.items():
        pct = (count / total_reviews * 100) if total_reviews > 0 else 0

        distribution_with_percentage[label] = {
            "count": count,
            "percentage": round(pct, 2)
        }

    return {
        "distribution": distribution_with_percentage,
        "total_reviews": total_reviews,
        "meta": reliability(total_reviews, MIN_SENTIMENT_DISTRIBUTION_REVIEWS)
    }


async def get_sentiment_trend_slope(db: AsyncSession, business_id: int):
    """
    Calculates the trend slope of sentiment scores over time. 
    Returns the trend classification (improving/declining/stable) along with the slope value.
    """
    # Calculate average sentiment score per day
    stmt = (
        select(
            func.date(Review.created_at).label("date"),
            func.avg(Review.sentiment_score).label("avg_score")
        )
        .where(Review.business_id == business_id)
        .group_by(func.date(Review.created_at))
        .order_by(func.date(Review.created_at))
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


async def get_sentiment_volatility(db: AsyncSession, business_id: int):
    """ 
    Measures stability of sentiment using standard deviation.
    Returns raw metric + mapped interpretation.
    """

    stmt = select(Review.sentiment_score).where(
        Review.business_id == business_id
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



# ===================================


# import {
#     AreaChart,
#     Area,
#     XAxis,
#     YAxis,
#     Tooltip,
#     ResponsiveContainer,
#     CartesianGrid,
#     Legend,
# } from "recharts";
# import { BarChart3 } from "lucide-react";

# import { GraphIcon } from "../icons/AnalyticsIcons";
# import ReviewProgressState from "./ReviewProgressState";

# /* TOOLTIP */
# const CustomTooltip = ({ active, payload, label }) => {
#     if (active && payload && payload.length) {
#         const point = payload[0].payload || {};
#         const reviews = point.review_count_per_period ?? point.review_count ?? 0;
#         const confidence = point.confidence ?? (point.is_reliable ? "high" : "low");

#         return (
#             <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-sm space-y-1">
#                 <p className="text-gray-500 font-medium mb-1">{label}</p>

#                 {payload.map((p) => (
#                     <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
#                         {p.name}: {p.value}%
#                     </p>
#                 ))}

#                 <div className="text-xs text-gray-500 mt-1">
#                     <div>Reviews in bucket: <span className="font-medium text-gray-700">{reviews}</span></div>
#                     <div>Confidence: <span className={`font-medium ${confidence === 'high' ? 'text-emerald-600' : 'text-amber-600'}`}>{confidence}</span></div>
#                 </div>
#             </div>
#         );
#     }
#     return null;
# };

# /* TRANSFORM */
# function transformData(rawData = []) {
#     return rawData.map((item) => {
#         // prefer backend-provided smoothed value when available
#         const score = (item.smoothed_avg_score ?? item.avg_score) ?? 0;

#         let positive = 0, negative = 0;

#         // small-signal threshold to avoid noise from near-zero values
#         if (score >= 0.05) positive = Math.round(score * 100);
#         else if (score <= -0.05) negative = Math.round(Math.abs(score) * 100);

#         const label = item.period?.toString()?.slice(5) ?? String(item.period);

#         return {
#             period: label,
#             positive,
#             negative,
#             // keep original bucket details for tooltip
#             review_count_per_period: item.review_count_per_period ?? item.review_count ?? 0,
#             confidence: item.confidence ?? (item.is_reliable ? "high" : "low"),
#         };
#     });
# }

# /* MAIN COMPONENT */
# function SentimentChart({ data = [], meta = {} }) {
#     const chartData = transformData(data);

#     const isEmpty = chartData.length === 0;
#     const isInsufficient = !meta?.is_reliable || chartData.length < 2;

#     const sampleSize = meta?.sample_size ?? 0;
#     const minRequired = meta?.min_required ?? 5;

#     const step = Math.ceil(chartData.length / 10);

#     return (
#         <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

#             {/* HEADER */}
#             <div className="flex items-center justify-between mb-1">
#                 <div className="flex items-center gap-2">
#                     <BarChart3 className="w-5 h-5 text-gray-700" />
#                     <h2 className="text-lg font-semibold text-gray-900">
#                         Customer Sentiment Trend
#                     </h2>
#                 </div>
#             </div>

#             <p className="text-xs text-gray-400 mb-5">
#                 Smoothed sentiment by time buckets — low-confidence buckets are flagged and smoothed
#             </p>

#             {/* BODY */}
#             {isEmpty ? (
#                 <div className="h-[260px] flex flex-col items-center justify-center gap-3 text-center">
#                     <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-300">
#                         <GraphIcon className="w-6 h-6" />
#                     </div>
#                     <p className="font-medium text-gray-700">No sentiment data yet</p>
#                     <p className="text-sm text-gray-400">
#                         Reviews will populate this chart over time.
#                     </p>
#                 </div>

#             ) : isInsufficient ? (
#                 <ReviewProgressState
#                     sampleSize={sampleSize}
#                     minRequired={minRequired}
#                     title="Almost there..."
#                     description="Need more reviews to generate reliable sentiment insights."
#                 />

#             ) : (
#                 <ResponsiveContainer width="100%" height={260}>
#                     <AreaChart data={chartData}>
#                         <CartesianGrid strokeDasharray="3 3" vertical={false} />

#                         <XAxis
#                             dataKey="period"
#                             tick={{ fontSize: 11, fill: "#9ca3af" }}
#                             interval={step - 1}
#                         />

#                         <YAxis
#                             domain={[0, 100]}
#                             tick={{ fontSize: 11, fill: "#9ca3af" }}
#                             tickFormatter={(v) => `${v}%`}
#                         />

#                         <Tooltip content={<CustomTooltip />} />

#                         <Legend />

#                                 <Area dataKey="positive" stroke="#22c55e" fill="#22c55e" />
#                                 <Area dataKey="negative" stroke="#ef4444" fill="#ef4444" />
#                     </AreaChart>
#                 </ResponsiveContainer>
#             )}
#         </div>
#     );
# }

# export default SentimentChart;