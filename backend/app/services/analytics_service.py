# IGNORE THIS FILE 

# import numpy as np
# from sklearn.linear_model import LinearRegression
# from sqlalchemy import func, select
# from sqlalchemy.ext.asyncio import AsyncSession
# import pandas as pd

# from backend.app.core.constants import (
#     ABSA_NEGATIVE_THRESHOLD,
#     ABSA_POSITIVE_THRESHOLD,
#     BUSINESS_HEALTH_CONFIG,
#     CONFIDENCE_SENTIMENT_WEIGHT,
#     CONFIDENCE_VOLUME_WEIGHT,
#     MIN_ASPECT_COUNT,
#     MIN_PEAK_DROP_POINTS,
#     MIN_SENTIMENT_DISTRIBUTION_REVIEWS,
#     MIN_VIBE_FORECAST_POINTS,
#     MIN_SENTIMENT_TIMESERIES_POINTS,
#     MIN_SENTIMENT_TREND_POINTS,
#     MIN_SENTIMENT_VOLATILITY_POINTS,
#     MIN_SPIKE_DATA_POINTS,
#     MIN_VIBE_TIMESERIES_POINTS,
#     MIN_VIBE_TREND_POINTS,
#     MIN_VIBE_VOLATILITY_POINTS,
#     SENTIMENT_TREND_NEGATIVE_THRESHOLD,
#     SENTIMENT_TREND_POSITIVE_THRESHOLD,
#     VIBE_TREND_NEGATIVE_SLOPE_THRESHOLD,
#     VIBE_TREND_POSITIVE_SLOPE_THRESHOLD,
#     Z_SCORE_SENTIMENT_THRESHOLD,
#     Z_SCORE_VOLUME_THRESHOLD,
#     FUTURE_FORECAST_MONTHS,
#     MIN_VIBE_SCORE,
#     MAX_VIBE_SCORE,
# )
# from backend.app.core.aspects import ASPECTS
# from backend.app.services.mapper_service import map_vibe_score
# from backend.app.services import health_score_service
# from backend.app.services.mapper_service import map_stability
# from backend.app.models.aspect_sentiment import AspectSentiment
# from backend.app.models.review import Review
# from backend.app.models.vibe_snapshot import VibeSnapshot



# # Meta class for analytics reliability checks
# class AnalyticsMeta:
#     @staticmethod
#     def reliability(sample_size: int, minimum: int):
#         return {
#             "is_reliable": sample_size >= minimum,
#             "sample_size": sample_size,
#             "min_required": minimum
#         }


# async def compute_business_health(
#     vibe_score: float,
#     trend: str,
#     aspects: dict,
#     review_count: int
# ):
#     """
#     Computes an overall health score for a business based on its:
#     - vibe score, 
#     - vibe score trend
#     - aspect consistency, and 
#     - review volume.
#     """
#     config = BUSINESS_HEALTH_CONFIG

#     # Data quality assessment (determines if we have enough data to compute a reliable health score, 
#     # and applies penalties if data is sparse)
#     data_quality = health_score_service.get_data_quality(review_count)


#     if data_quality == "no_data":
#         return health_score_service.get_no_data_business_health()

#     # Normalize vibe score and trend to 0–1 range for scoring
#     vibe_norm = health_score_service.normalize_vibe_score(vibe_score)
#     trend_norm = health_score_service.normalize_trend(trend, config)

#     # aspect consistency (measures how consistent the aspect sentiment scores are,
#     #  which can indicate reliability of overall vibe)
#     aspect_values  = [
#         a["avg_score"]
#         for a in aspects.values()
#         if isinstance(a, dict) and "avg_score" in a
#     ]

#     aspect_result = health_score_service.compute_aspect_alignment(
#         aspect_values,
#         config
#     )

#     consistency = aspect_result["consistency"]

#     # confidence (measures how much we can trust the vibe score based on volume and sentiment strength of reviews)
#     confidence = health_score_service.compute_confidence(
#         review_count,
#         config
#     )

#     # cold start detection (if we have very few reviews, we should rely more on consistency and less on vibe/trend)
#     cold_start_threshold = config["confidence"]["min_score"]
#     is_cold_start = review_count < cold_start_threshold

#     # final health score computation using weighted signals and data quality adjustments
#     score = health_score_service.compute_final_score(
#         vibe=vibe_norm,
#         trend=trend_norm,
#         consistency=consistency,
#         confidence=confidence,
#         is_cold_start=is_cold_start,
#         data_quality=data_quality,
#         config=config
#     )

#     # map final score to health label for UI presentation (e.g. "Healthy", "At Risk", "Unhealthy")
#     health_label = health_score_service.map_business_health_label(score)
#     alignment_label = health_score_service.map_alignment(alignment, review_count)
#     confidence_label = health_score_service.map_confidence(confidence, review_count)

#     # return detailed health response with all signals and labels for transparency and debugging
#     return health_score_service.build_health_response(
#         score=score,
#         raw_vibe=vibe_score,
#         trend=trend,
#         review_count=review_count,
#         data_quality=data_quality,
#         is_cold_start=is_cold_start,
#         vibe_norm=vibe_norm,
#         trend_norm=trend_norm,
#         consistency=consistency,
#         confidence=confidence,
#         health_label=health_label,
#         alignment_label=alignment_label,
#         confidence_label=confidence_label
#     )


# # ---------------------------
# # SENTIMENT RELATED ANALYTICS
# # ---------------------------

# async def get_sentiment_over_time(
#     db: AsyncSession,
#     business_id: int,
#     granularity: str
# ):
#     """
#     Aggregates average sentiment score and review count over time for a business,
#     grouped by the specified granularity (daily, weekly, monthly). This provides    
#     """
#     if granularity == "daily":
#         bucket = func.date(Review.created_at)

#     elif granularity == "weekly":
#         bucket = func.strftime("%Y-%W", Review.created_at)

#     elif granularity == "monthly":
#         bucket = func.strftime("%Y-%m", Review.created_at)

#     else:
#         raise ValueError("Invalid granularity")

#     # Aggregate average sentiment score and count of reviews in each time bucket
#     stmt = (
#         select(
#             bucket.label("period"),
#             func.avg(Review.sentiment_score).label("avg_score"),
#             func.count(Review.id).label("count"),
#         )
#         .where(Review.business_id == business_id)
#         .group_by("period")
#         .order_by("period")
#     )

#     result = await db.execute(stmt)
#     rows = result.all()

#     return {
#         "data": [
#             {
#                 "period": row.period,
#                 "avg_score": float(row.avg_score) if row.avg_score is not None else 0,
#                 "review_count_per_period": row.count, # count of reviews in each period
#             }
#             for row in rows
#         ],
#         "meta": AnalyticsMeta.reliability(len(rows), MIN_SENTIMENT_TIMESERIES_POINTS)
#     }


# async def get_sentiment_distribution(db: AsyncSession, business_id: int):
#     """
#     Calculates the distribution of sentiment labels for a given business.
#     Returns the count and percentage of positive, negative, and neutral reviews, along with a reliability meta.
#     """

#     # Aggregate count of reviews by sentiment label
#     stmt = (
#         select(
#             Review.sentiment_label,
#             func.count(Review.id).label("count")
#         )
#         .where(Review.business_id == business_id)
#         .group_by(Review.sentiment_label)
#     )

#     result = await db.execute(stmt)

#     counts = {"positive": 0, "negative": 0, "neutral": 0}

#     total_reviews = 0

#     # Calculate total reviews and counts for each sentiment label
#     for row in result:
#         label = row.sentiment_label or "neutral"
#         counts[label] = counts.get(label, 0) + row.count
#         total_reviews += row.count

#     distribution_with_percentage = {}

#     # Calculate percentage for each sentiment label 
#     for label, count in counts.items():
#         pct = (count / total_reviews * 100) if total_reviews > 0 else 0

#         distribution_with_percentage[label] = {
#             "count": count,
#             "percentage": round(pct, 2)
#         }

#     return {
#         "distribution": distribution_with_percentage,
#         "total_reviews": total_reviews,
#         "meta": AnalyticsMeta.reliability(total_reviews, MIN_SENTIMENT_DISTRIBUTION_REVIEWS)
#     }


# async def get_peak_and_drop(db: AsyncSession, business_id: int):
#     """
#     Identify the largest positive and negative day-over-day sentiment shifts.

#     Returns:
#     - peak: biggest positive sentiment change
#     - drop: biggest negative sentiment change
#     - includes sentiment before/after change + review volume
#     """

#     stmt = (
#         select(
#             func.date(Review.created_at).label("date"),
#             func.avg(Review.sentiment_score).label("avg_score"),
#             func.count(Review.id).label("review_count")
#         )
#         .where(Review.business_id == business_id)
#         .group_by(func.date(Review.created_at))
#         .order_by(func.date(Review.created_at))
#     )

#     result = await db.execute(stmt)
#     rows = result.all()

#     # Reliability check
#     if len(rows) < MIN_PEAK_DROP_POINTS:
#         return {
#             "peak": None,
#             "drop": None,
#             "meta": AnalyticsMeta.reliability(
#                 len(rows),
#                 MIN_PEAK_DROP_POINTS
#             )
#         }

#     diffs = []

#     # Compute day-over-day sentiment changes
#     for i in range(1, len(rows)):
#         prev_score = float(rows[i - 1].avg_score or 0)
#         curr_score = float(rows[i].avg_score or 0)

#         diff = curr_score - prev_score

#         diffs.append({
#             "date": rows[i].date,
#             "change": round(diff, 4),
#             "previous_score": round(prev_score, 4),
#             "current_score": round(curr_score, 4),
#             "review_count": int(rows[i].review_count)
#         })

#     if not diffs:
#         return {
#             "peak": None,
#             "drop": None,
#             "meta": AnalyticsMeta.reliability(
#                 len(rows),
#                 MIN_PEAK_DROP_POINTS
#             )
#         }

#     peak = max(diffs, key=lambda x: x["change"])
#     drop = min(diffs, key=lambda x: x["change"])

#     return {
#         "peak": peak,
#         "drop": drop,
#         "meta": AnalyticsMeta.reliability(
#             len(rows),
#             MIN_PEAK_DROP_POINTS
#         )
#     }



# async def get_sentiment_trend_slope(db: AsyncSession, business_id: int):
#     """
#     Calculates the trend slope of sentiment scores over time. 
#     Returns the trend classification (improving/declining/stable) along with the slope value.
#     """
#     # Calculate average sentiment score per day
#     stmt = (
#         select(
#             func.date(Review.created_at).label("date"),
#             func.avg(Review.sentiment_score).label("avg_score")
#         )
#         .where(Review.business_id == business_id)
#         .group_by(func.date(Review.created_at))
#         .order_by(func.date(Review.created_at))
#     )

#     result = await db.execute(stmt)
#     rows = result.all()

#     # Reliability check (prevents noisy / invalid regression)
#     is_reliable = len(rows) >= MIN_SENTIMENT_TREND_POINTS

#     if not is_reliable:
#         return {
#             "trend": "insufficient_data",
#             "slope": 0.0,
#             "meta": AnalyticsMeta.reliability(len(rows), MIN_SENTIMENT_TREND_POINTS)
#         }

#     # Prepare regression data
#     x = np.arange(len(rows))
#     y = np.array([r.avg_score for r in rows])

#     # Linear regression slope
#     slope = np.polyfit(x, y, 1)[0]

#     # Interpret trend
#     trend = (
#         "improving" if slope > SENTIMENT_TREND_POSITIVE_THRESHOLD
#         else "declining" if slope < SENTIMENT_TREND_NEGATIVE_THRESHOLD
#         else "stable"
#     )

#     return {
#         "trend": trend,
#         "slope": float(slope),
#         "meta": AnalyticsMeta.reliability(len(rows), MIN_SENTIMENT_TREND_POINTS)
#     }
    


# async def get_sentiment_volatility(db: AsyncSession, business_id: int):
#     """ 
#     Measures stability of sentiment using standard deviation.
#     Returns raw metric + mapped interpretation.
#     """

#     stmt = select(Review.sentiment_score).where(
#         Review.business_id == business_id
#     )

#     result = await db.execute(stmt)
#     scores = [r[0] for r in result if r[0] is not None]

#     total_points = len(scores)

#     # reliability guard (don't report volatility if we have very few reviews, as it would be noisy and unreliable)
#     if total_points < MIN_SENTIMENT_VOLATILITY_POINTS:
#         return {
#             "volatility": 0.0,
#             "stability": "insufficient_data",
#             "interpretation": map_stability(0.0, "sentiment_volatility", 0)["message"],
#             "meta": AnalyticsMeta.reliability(
#                 total_points,
#                 MIN_SENTIMENT_VOLATILITY_POINTS
#             )
#         }

#     # Standard deviation of sentiment scores as volatility measure
#     volatility = float(np.std(scores))

#     # map raw volatility to stability label and interpretation message
#     mapped = map_stability(
#         volatility=volatility,
#         metric="sentiment_volatility",
#         data_points=total_points
#     )

#     return {
#         "volatility": volatility,
#         "stability": mapped["label"],
#         "interpretation": mapped["message"],
#         "meta": AnalyticsMeta.reliability(
#             total_points,
#             MIN_SENTIMENT_VOLATILITY_POINTS
#         )
#     }



# # ---------------------------
# # VIBE SCORE RELATED ANALYTICS
# # ---------------------------

# async def get_vibe_volatility(db: AsyncSession, business_id: int):
#     """
#     Measures stability of vibe scores using standard deviation of historical snapshots.
#     """

#     stmt = select(VibeSnapshot.vibe_score).where(
#         VibeSnapshot.business_id == business_id
#     )

#     result = await db.execute(stmt)
#     rows = result.all()

#     scores = [r[0] for r in rows if r[0] is not None]
#     total_points = len(scores)

#     # reliability guard (don't report volatility if we have very few snapshots, as it would be noisy and unreliable)
#     if total_points < MIN_VIBE_VOLATILITY_POINTS:
#         return {
#             "volatility": 0.0,
#             "stability": "insufficient_data",
#             "interpretation": map_stability(0.0, "vibe_volatility", 0)["message"],
#             "meta": AnalyticsMeta.reliability(
#                 total_points,
#                 MIN_VIBE_VOLATILITY_POINTS
#             )
#         }

#     # Standard deviation of vibe scores as volatility measure
#     volatility = float(np.std(scores))

#     # map raw volatility to stability label and interpretation message
#     mapped = map_stability(
#         volatility=volatility,
#         metric="vibe_volatility",
#         data_points=total_points
#     )

#     return {
#         "volatility": volatility,
#         "stability": mapped["label"],
#         "interpretation": mapped["message"],
#         "meta": AnalyticsMeta.reliability(
#             total_points,
#             MIN_VIBE_VOLATILITY_POINTS
#         )
#     }



# async def get_vibe_score_over_time(db: AsyncSession, business_id: int, granularity: str):
#     """
#     Aggregates average vibe score from snapshots over time for a business,
#     grouped by the specified granularity (daily, weekly, monthly). This provides a time series 
#     of vibe scores to analyze trends and patterns.
#     """
#     if granularity == "daily":
#         bucket = func.date(VibeSnapshot.snapshot_date)

#     elif granularity == "weekly":
#         bucket = func.strftime("%Y-%W", VibeSnapshot.snapshot_date)

#     elif granularity == "monthly":
#         bucket = func.strftime("%Y-%m", VibeSnapshot.snapshot_date)

#     else:
#         raise ValueError("Invalid granularity")

#     # Aggregate average vibe score and count of snapshots in each time bucket
#     stmt = (
#         select(
#             bucket.label("period"),
#             func.avg(VibeSnapshot.vibe_score).label("avg_score"),
#             func.count(VibeSnapshot.id).label("snapshot_count"),
#         )
#         .where(VibeSnapshot.business_id == business_id)
#         .group_by("period")
#         .order_by("period")
#     )

#     result = await db.execute(stmt)
#     rows = result.all()

#     return {
#         "data": [
#             {
#                 "period": row.period,
#                 "avg_score": float(row.avg_score) if row.avg_score is not None else 0,
#                 "snapshot_count": row.snapshot_count,
#             }
#             for row in rows
#         ],
#         "meta": AnalyticsMeta.reliability(
#             len(rows),
#             MIN_VIBE_TIMESERIES_POINTS
#         )
#     }


# async def get_vibe_score_trend(db: AsyncSession, business_id: int):
#     """
#     Calculates the trend of vibe scores over time using linear regression slope.
#     Returns the trend classification (improving/declining/stable) along with the slope value
#     """
#     stmt = (
#         select(VibeSnapshot.snapshot_date, VibeSnapshot.vibe_score)
#         .where(VibeSnapshot.business_id == business_id)
#         .order_by(VibeSnapshot.snapshot_date)
#     )

#     result = await db.execute(stmt)
#     rows = result.all()

#     # Reliability check - need enough data points to identify meaningful trend
#     if len(rows) < MIN_VIBE_TREND_POINTS:
#         return {
#             "trend": "insufficient_data",
#             "slope": 0.0,
#             "meta": AnalyticsMeta.reliability(
#                 len(rows),
#                 MIN_VIBE_TREND_POINTS
#             )
#         }

#     # Prepare data for regression - convert dates to ordinal or numeric format
#     base_date = rows[0].snapshot_date

#     # Convert snapshot dates to number of days since the first snapshot for regression
#     x = np.array([
#         (r.snapshot_date - base_date).days
#         for r in rows
#     ])

#     # Vibe scores as the target variable
#     y = np.array([r.vibe_score for r in rows])

#     # Calculate slope using linear regression 
#     slope = np.polyfit(x, y, 1)[0]

#     # Interpret trend based on slope thresholds
#     if slope > VIBE_TREND_POSITIVE_SLOPE_THRESHOLD:
#         trend = "improving"
#     elif slope < VIBE_TREND_NEGATIVE_SLOPE_THRESHOLD:
#         trend = "declining"
#     else:
#         trend = "stable"

#     return {
#         "trend": trend,
#         "slope": float(slope),
#         "meta": AnalyticsMeta.reliability(
#             len(rows),
#             MIN_VIBE_TREND_POINTS
#         )
#     }



# async def forecast_vibe_score(db: AsyncSession, business_id: int):
#     """
#     Forecast future vibe score using linear regression on historical monthly vibe scores.

#     Returns:
#     - historical vibe score trend
#     - 6-month forecast
#     - predicted vibe classification
#     """

#     # -------------------------
#     # FETCH HISTORICAL DATA
#     # -------------------------
#     response = await get_vibe_score_over_time(
#         db,
#         business_id,
#         "monthly"
#     )

#     data = response.get("data", [])

#     # -------------------------
#     # VALIDATION
#     # -------------------------
#     if len(data) < MIN_VIBE_FORECAST_POINTS:
#         return {
#             "status": "insufficient_data",
#             "history": data,
#             "forecast": [],
#             "meta": AnalyticsMeta.reliability(
#                 len(data),
#                 MIN_VIBE_FORECAST_POINTS
#             )
#         }

#     # -------------------------
#     # PREPARE TRAINING DATA
#     # -------------------------
#     y = np.array([
#         item["avg_score"]
#         for item in data
#     ])

#     x = np.arange(len(y)).reshape(-1, 1)

#     # -------------------------
#     # TRAIN MODEL
#     # -------------------------
#     model = LinearRegression()
#     model.fit(x, y)

#     # -------------------------
#     # FORECAST FUTURE MONTHS
#     # -------------------------
#     future_x = np.arange(
#         len(y),
#         len(y) + FUTURE_FORECAST_MONTHS
#     ).reshape(-1, 1)

#     future_y = model.predict(future_x)

#     # Clamp to valid vibe score range (1-5)
#     future_y = np.clip(
#         future_y,
#         MIN_VIBE_SCORE,
#         MAX_VIBE_SCORE
#     )

#     # -------------------------
#     # FORMAT FORECAST
#     # -------------------------
#     forecast = [
#         {
#             "period": len(y) + i,
#             "predicted": float(score)
#         }
#         for i, score in enumerate(future_y)
#     ]

#     # -------------------------
#     # FINAL FORECAST VALUE
#     # -------------------------
#     final_prediction = float(future_y[-1])

#     predicted_vibe = map_vibe_score(final_prediction)

#     # -------------------------
#     # RETURN
#     # -------------------------
#     return {
#         "history": data,
#         "forecast": forecast,
#         "forecast_score": final_prediction,
#         "predicted_vibe": predicted_vibe,
#         "forecast_months": FUTURE_FORECAST_MONTHS,
#         "meta": AnalyticsMeta.reliability(
#             len(data),
#             MIN_VIBE_FORECAST_POINTS
#         )
#     }


# # --------------------------
# # ABSA ANALYTICS
# # --------------------------

# async def get_business_aspect_summary(
#         db: AsyncSession,
#         business_id: int
#     ):
#     """
#     Provides aspect-level sentiment analysis summary for a business, including average sentiment score,
#     review count, and a label (positive/negative/neutral) for each aspect. Also includes trend data to show
#     sentiment trends over time.
#     """

#     # Aggregate aspect sentiment scores and counts grouped by aspect and month
#     stmt = (
#         select(
#             AspectSentiment.aspect,
#             func.strftime("%Y-%m", Review.created_at).label("period"),
#             func.avg(AspectSentiment.sentiment_score).label("avg_score"),
#             func.count(AspectSentiment.id).label("count"),
#         )
#         .join(Review, AspectSentiment.review_id == Review.id)
#         .where(Review.business_id == business_id)
#         .group_by(
#             AspectSentiment.aspect,
#             func.strftime("%Y-%m", Review.created_at)
#         )
#         .order_by(AspectSentiment.aspect, "period")
#     )

#     result = await db.execute(stmt)
#     rows = result.all()

#     if not rows:
#         return {
#             "summary": {},
#             "trends": {},
#             "meta": AnalyticsMeta.reliability(0, MIN_ASPECT_COUNT)
#         }

#     summary = {}
#     trends = {}

#     total_aspects = 0

#     # Calculate weighted average sentiment score for each aspect and prepare trend data
#     for row in rows:
#         aspect = row.aspect
#         avg = float(row.avg_score)
#         count = int(row.count)
#         period = row.period

#         total_aspects += count

#         #  
#         if aspect not in summary:
#             summary[aspect] = {
#                 "total_score": 0.0,
#                 "total_count": 0
#             }

#         summary[aspect]["total_score"] += avg * count
#         summary[aspect]["total_count"] += count

#         # Prepare data for trend analysis
#         if aspect not in trends:
#             trends[aspect] = []

#         trends[aspect].append({
#             "period": period,
#             "avg_score": avg,
#             "count": count
#         })

#     # -----------------------------
#     # finalize summary + compute trends
#     # -----------------------------
#     final_summary = {}
#     final_trends = {}

#     for aspect, data in summary.items():
#         avg = data["total_score"] / data["total_count"]

#         # -------------------------
#         # SUMMARY LABEL
#         # -------------------------
#         label = (
#             "positive" if avg > ABSA_POSITIVE_THRESHOLD
#             else "negative" if avg < ABSA_NEGATIVE_THRESHOLD
#             else "neutral"
#         )

#         final_summary[aspect] = {
#             "avg_score": avg,
#             "count": data["total_count"],
#             "label": label
#         }

#     # -----------------------------
#     # TREND CLASSIFICATION
#     # -----------------------------
#     def compute_trend(points):
#         if len(points) < 2:
#             return "stable"

#         points = sorted(points, key=lambda x: x["period"])

#         first = points[0]["avg_score"]
#         last = points[-1]["avg_score"]

#         delta = last - first

#         if delta > 0.05:
#             return "improving"
#         elif delta < -0.05:
#             return "declining"
#         return "stable"

#     for aspect, points in trends.items():
#         final_trends[aspect] = {
#             "data": points,
#             "trend": compute_trend(points)
#         }

#     # -----------------------------
#     # return
#     # -----------------------------
#     return {
#         "summary": final_summary,
#         "trends": final_trends,
#         "meta": AnalyticsMeta.reliability(total_aspects, MIN_ASPECT_COUNT)
#     }


# async def get_frequent_aspect_mining(
#         db: AsyncSession,
#         business_id: int,
#         aspects: dict,
#     ):
#         """
#         Builds a frequent aspect mining payload using the existing aspect summary.

#         Returns all known aspects, including zero-count aspects, so the UI can
#         show a complete sample distribution.
#         """

#         aspect_summary = aspects.get("summary", {}) if isinstance(aspects, dict) else {}

#         total_mentions = sum(item.get("count", 0) for item in aspect_summary.values())

#         frequent_aspects = [
#             {
#                 "term": aspect,
#                 "count": int(aspect_summary.get(aspect, {}).get("count", 0)),
#             }
#             for aspect in ASPECTS.keys()
#         ]

#         return {
#             "status": "computed" if aspect_summary else "no_data",
#             "aspects": frequent_aspects,
#             "meta": AnalyticsMeta.reliability(
#                 sample_size=total_mentions,
#                 minimum=1
#             ),
#         }


# # --------------------------
# # VIBE-TREND ANALYTICS
# # --------------------------

# async def get_review_event_detection(db: AsyncSession, business_id: int):

#         stmt = (
#             select(
#                 func.date(Review.created_at).label("date"),
#                 func.avg(Review.sentiment_score).label("avg_sentiment"),
#                 func.count(Review.id).label("count"),
#                 func.extract("dow", Review.created_at).label("weekday")
#             )
#             .where(Review.business_id == business_id)
#             .group_by(func.date(Review.created_at), func.extract("dow", Review.created_at))
#             .order_by(func.date(Review.created_at))
#         )

#         result = await db.execute(stmt)
#         rows = result.all()

#         if len(rows) < MIN_SPIKE_DATA_POINTS:
#             return {
#                 "event_type": "insufficient_data",
#                 "confidence": 0,
#                 "interpretation": "Not enough customer reviews yet to detect meaningful changes.",
#                 "meta": AnalyticsMeta.reliability(len(rows), MIN_SPIKE_DATA_POINTS)
#             }

#         df = pd.DataFrame(rows, columns=["date", "sentiment", "volume", "weekday"])

#         # ----------------------------------
#         # STEP 1: SEASONALITY NORMALIZATION
#         # ----------------------------------
#         weekday_baseline_sentiment = df.groupby("weekday")["sentiment"].mean()
#         weekday_baseline_volume = df.groupby("weekday")["volume"].mean()

#         df["sentiment_deseasonalized"] = df.apply(
#             lambda r: r["sentiment"] - weekday_baseline_sentiment[r["weekday"]],
#             axis=1
#         )

#         df["volume_deseasonalized"] = df.apply(
#             lambda r: r["volume"] - weekday_baseline_volume[r["weekday"]],
#             axis=1
#         )

#         # ----------------------------------
#         # STEP 2: TREND EXTRACTION (7-day rolling mean)
#         # ----------------------------------
#         df["sentiment_trend"] = df["sentiment_deseasonalized"].rolling(7, min_periods=3).mean()
#         df["volume_trend"] = df["volume_deseasonalized"].rolling(7, min_periods=3).mean()

#         df["sentiment_trend"] = df["sentiment_trend"].fillna(
#             df["sentiment_deseasonalized"].mean()
#         )
#         df["volume_trend"] = df["volume_trend"].fillna(
#             df["volume_deseasonalized"].mean()
#         )

#         # ----------------------------------
#         # STEP 3: RESIDUAL SIGNAL
#         # ----------------------------------
#         df["sentiment_residual"] = df["sentiment_deseasonalized"] - df["sentiment_trend"]
#         df["volume_residual"] = df["volume_deseasonalized"] - df["volume_trend"]

#         # ----------------------------------
#         # STEP 4: Z-SCORE
#         # ----------------------------------
#         def stable_z(series):
#             std = np.std(series)
#             if std == 0:
#                 std = 1.0
#             return (series - np.mean(series)) / std

#         sentiment_z = stable_z(df["sentiment_residual"])
#         volume_z = stable_z(df["volume_residual"])

#         latest_sentiment_z = sentiment_z.iloc[-1]
#         latest_volume_z = volume_z.iloc[-1]

#         # ----------------------------------
#         # STEP 5: DETECTION LOGIC
#         # ----------------------------------
#         sentiment_spike = abs(latest_sentiment_z) > Z_SCORE_SENTIMENT_THRESHOLD
#         volume_spike = abs(latest_volume_z) > Z_SCORE_VOLUME_THRESHOLD

#         if sentiment_spike and volume_spike:
#             event_type = "true_event"
#             interpretation = (
#                 "There is a clear shift in customer experience, "
#                 "with changes in both sentiment and review activity. "
#                 "This likely reflects a real operational or customer-facing issue."
#             )

#         elif sentiment_spike:
#             event_type = "sentiment_event"
#             interpretation = (
#                 "Customers are expressing noticeably different opinions than usual, "
#                 "even though review activity remains normal."
#             )

#         elif volume_spike:
#             event_type = "activity_event"
#             interpretation = (
#                 "There is unusual review activity compared to normal patterns, "
#                 "but customer sentiment has not changed significantly."
#             )

#         elif abs(latest_sentiment_z) > 1.5 or abs(latest_volume_z) > 1.5:
#             event_type = "emerging_event"
#             interpretation = (
#                 "Early signs of change detected in customer feedback. "
#                 "This may indicate a developing issue worth monitoring."
#             )

#         else:
#             event_type = "no_anomaly"
#             interpretation = (
#                 "Customer experience is stable with no unusual changes detected."
#             )

#         # ----------------------------------
#         # STEP 6: CONFIDENCE
#         # ----------------------------------
#         confidence_raw = (
#             min(abs(latest_sentiment_z), 3) * CONFIDENCE_SENTIMENT_WEIGHT +
#             min(abs(latest_volume_z), 3) * CONFIDENCE_VOLUME_WEIGHT
#         )

#         confidence = int(min(100, confidence_raw * 25))
#         confidence *= min(len(rows) / MIN_SPIKE_DATA_POINTS, 1.0)
#         confidence = int(confidence)

#         # ----------------------------------
#         # RETURN
#         # ----------------------------------
#         return {
#             "event_type": event_type,
#             "confidence": confidence,
#             "z_scores": {
#                 "sentiment_z": float(latest_sentiment_z),
#                 "volume_z": float(latest_volume_z)
#             },
#             "baseline": {
#                 "note": "Compared against normal weekly behavior and recent trends"
#             },
#             "interpretation": interpretation,
#             "meta": AnalyticsMeta.reliability(len(rows), MIN_SPIKE_DATA_POINTS)
#         }


# async def get_latest_vibe(db: AsyncSession, business_id: int):
#         stmt = (
#             select(VibeSnapshot)
#             .where(VibeSnapshot.business_id == business_id)
#             .order_by(VibeSnapshot.snapshot_date.desc())
#             .limit(1)
#         )

#         result = await db.execute(stmt)
#         row = result.scalar_one_or_none()

#         if not row:
#             return {"status": "no_data"}

#         return {
#             "vibe_score": row.vibe_score,
#             "vibe_label": row.vibe_label,
#             "reviews_analyzed": row.review_count,
#             "date": row.snapshot_date
#         }