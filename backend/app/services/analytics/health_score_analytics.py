from backend.app.core.constants import BUSINESS_HEALTH_CONFIG
from backend.app.services import health_score_service

async def compute_business_health(
    vibe_score: float,
    trend: str,
    aspects: dict,
    review_count: int
):
    """
    Computes an overall health score for a business based on its:
    - vibe score, 
    - vibe score trend
    - aspect consistency, and 
    - review volume.
    """
    config = BUSINESS_HEALTH_CONFIG

    # Data quality assessment (determines if we have enough data to compute a reliable health score, 
    # and applies penalties if data is sparse)
    data_quality = health_score_service.get_data_quality(review_count)


    if data_quality == "no_data":
        return health_score_service.get_no_data_business_health()

    # Normalize vibe score and trend to 0–1 range for scoring
    vibe_norm = health_score_service.normalize_vibe_score(vibe_score)
    trend_norm = health_score_service.normalize_trend(trend, config)

    # aspect alignment (measures how aligned the aspect sentiment scores are,
    # which can indicate reliability of overall vibe)
    aspect_values  = [
        a["avg_score"]
        for a in aspects.values()
        if isinstance(a, dict) and "avg_score" in a
    ]

    aspect_result = health_score_service.compute_aspect_alignment(
        aspect_values,
        config
    )

    alignment = aspect_result["alignment"]

    # confidence (measures how much we can trust the vibe score based on volume and sentiment strength of reviews)
    confidence = health_score_service.compute_confidence(
        review_count,
        config
    )

    # cold start detection (if we have very few reviews, we should rely more on consistency and less on vibe/trend)
    cold_start_threshold = config["confidence"]["min_score"]
    is_cold_start = review_count < cold_start_threshold

    # final health score computation using weighted signals and data quality adjustments
    score = health_score_service.compute_final_score(
        vibe=vibe_norm,
        trend=trend_norm,
        alignment=alignment,
        confidence=confidence,
        is_cold_start=is_cold_start,
        data_quality=data_quality,
        config=config
    )

    # map final score to health label for UI presentation (e.g. "Healthy", "At Risk", "Unhealthy")
    health_label = health_score_service.map_business_health_label(score)
    alignment_label = health_score_service.map_alignment(alignment, review_count)
    confidence_label = health_score_service.map_confidence(confidence, review_count)

    # return detailed health response with all signals and labels for transparency and debugging
    return health_score_service.build_health_response(
        score=score,
        raw_vibe=vibe_score,
        trend=trend,
        review_count=review_count,
        data_quality=data_quality,
        is_cold_start=is_cold_start,
        vibe_norm=vibe_norm,
        trend_norm=trend_norm,
        alignment=alignment,
        confidence=confidence,
        health_label=health_label,
        alignment_label=alignment_label,
        confidence_label=confidence_label
    )
