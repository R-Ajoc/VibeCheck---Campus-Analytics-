# This module contains functions to compute insights from aspect-level analytics, including:
# - Primary risk driver: which aspect is currently the biggest source of risk to the business?
# - Negative signals: what are the top signals indicating potential issues?
# - Positive drivers: which aspects are currently the biggest sources of positive value?

from backend.app.core.constants import (
    ASPECT_INTELLIGENCE_CONFIG,
    BUSINESS_HEALTH_CONFIG,
    MIN_NEGATIVE_SIGNAL_POINTS,
    PRIMARY_RISK_DRIVER_CONFIG,
    POSITIVE_DRIVER_CONFIG
)
from backend.app.services.analytics.helpers import reliability


def _get_confidence_factor(sample_size, min_required):
    """
    Applies soft confidence scaling based on data maturity.
    
    Early-stage data (few reviews) gets lower confidence multiplier.
    Mature data (20+ reviews) gets full confidence.
    
    Purpose: Prevent interpreting early signals as reliable patterns.
    """
    if sample_size == 0:
        return 0.0
    if sample_size >= min_required * 4:  # 4x minimum = fully confident
        return 1.0
    # Linear interpolation: 0 confidence at 0, 1.0 at 4x min_required
    return min(sample_size / (min_required * 4), 1.0)


def _get_adaptive_risk_threshold(sample_size, min_required):
    """
    Adaptive thresholds for risk impact classification.
    
    Small datasets need higher thresholds to avoid false positives.
    As sample size grows, thresholds normalize.
    
    MVP rule:
    - < 5 samples: threshold = 85 (very high bar for "high_impact")
    - 5-20 samples: threshold = 75 (moderate bar)
    - 20+ samples: threshold = 70 (standard bar)
    """
    config = PRIMARY_RISK_DRIVER_CONFIG
    base_high = config["thresholds"]["high_impact_base"]  # 70
    
    if sample_size < min_required:  # < 5
        return 85  # very conservative: need very strong signal
    elif sample_size < min_required * 4:  # 5-20
        # Linear interpolation from 85 → 70 as we go from 5 → 20 samples
        return 85 - (sample_size - min_required) / (min_required * 3) * 15
    else:  # 20+
        return base_high  # standard threshold


def _get_adaptive_positive_threshold(sample_size, min_required):
    """
    Adaptive thresholds for positive driver strength classification.
    
    Mirrors risk threshold logic: conservative on small datasets.
    """
    config = POSITIVE_DRIVER_CONFIG
    base_strong = config["thresholds"]["strong_base"]  # 70
    
    if sample_size < min_required:  # < 5
        return 85  # very high bar
    elif sample_size < min_required * 4:  # 5-20
        return 85 - (sample_size - min_required) / (min_required * 3) * 15
    else:  # 20+
        return base_strong


def get_primary_risk_driver(aspect_summary, aspect_trends, review_count):
    config = PRIMARY_RISK_DRIVER_CONFIG
    min_required = config["reliability"]["min_aspect_mentions"]

    if not aspect_summary:
        return {
            "status": "no_data",
            "driver": None,
            "impact": None,
            "score": 0,
            "meta": reliability(sample_size=0, minimum=min_required)
        }

    trend_map = config["trend"]["mapping"]
    total_mentions = sum(a.get("count", 0) for a in aspect_summary.values())
    confidence_factor = _get_confidence_factor(total_mentions, min_required)

    risk_scores = {}

    for aspect, data in aspect_summary.items():
        avg_score = data.get("avg_score", 0)

        # Convert from -1..1 scale to 0..1, then get negativity
        normalized = (avg_score + 1) / 2  # -1 → 0, 0 → 0.5, 1 → 1
        negativity_score = 1 - normalized  # lower sentiment = higher risk

        trend_label = aspect_trends.get(aspect, {}).get("trend", "stable")
        trend_score = trend_map.get(trend_label, 0)

        raw_score = (
            negativity_score * 0.70 +
            trend_score * 0.30
        ) * 100

        adjusted_score = raw_score * confidence_factor
        risk_scores[aspect] = max(0, min(100, adjusted_score))

    driver = max(risk_scores, key=risk_scores.get)
    top_score = risk_scores[driver]

    adaptive_high = _get_adaptive_risk_threshold(total_mentions, min_required)
    adaptive_medium = config["thresholds"]["medium_impact_base"]

    if top_score >= adaptive_high:
        impact = "HIGH"
    elif top_score >= adaptive_medium:
        impact = "MEDIUM"
    else:
        impact = "LOW"

    return {
        "status": "computed",
        "driver": driver,
        "impact": impact,
        "score": round(top_score, 2),
        "meta": reliability(sample_size=total_mentions, minimum=min_required)
    }


def get_negative_signals(
    aspect_summary: dict,
    aspect_trends: dict,
    vibe_trend: dict,
    sentiment_volatility: dict,
    event_detection: dict
):
    """ 
    Identifies the top signals indicating potential issues. 
    Signals include:
    - Aspect-level negativity and declining trends
    - Overall vibe decline
    - High volatility in sentiment
    """
    SEVERITY_ORDER = {
        "high": 0,
        "medium": 1,
        "low": 2
    }

    if not aspect_summary:
        return {
            "status": "no_data",
            "signals": [],
            "pattern": "Not enough review data yet to identify recurring issues.",
            "meta": reliability(
                sample_size=0,
                minimum=MIN_NEGATIVE_SIGNAL_POINTS
            )
        }

    signals = []
    negative_aspects = []

    # Aspect-level risks 
    for aspect, data in aspect_summary.items():
        label = data.get("label")
        trend = aspect_trends.get(aspect, {}).get("trend", "stable")

        if label is None:
            avg = data.get("avg_score", 0.5)
            label = "negative" if avg < 0.4 else "neutral"

        if label == "negative":
            negative_aspects.append(aspect)

            if trend == "declining":
                signals.append({
                    "text": f"Negative sentiment regarding {aspect.title()} has increased recently.",
                    "severity": "high"
                })
            else:
                signals.append({
                    "text": f"{aspect.title()} is a primary area of concern for students.",
                    "severity": "medium"
                })

    # Overall vibe decline
    if vibe_trend.get("trend") == "declining":
        signals.append({
            "text": "Overall campus sentiment is declining",
            "severity": "high"
        })

    # High volatility in sentiment
    if sentiment_volatility.get("stability") == "unstable":
        signals.append({
            "text": "Student feedback is flunctuating over time",
            "severity": "medium"
        })

    # Event detection signals (e.g., sudden spikes in negative sentiment)
    event_type = event_detection.get("event_type")

    # "true_event" indicates a significant, sustained change in customer experience that is unlikely to be noise.
    if event_type == "true_event":
        signals.append({
            "text": "Significant change in campus sentiment detected",
            "severity": "high"
        })

    # "sentiment_only_spike" indicates a sudden surge in sentiment (positive or negative) 
    # without a clear trend, which can be an early warning signal of emerging issues or improvements. 
    # We flag it as low severity because it's a single data point and may not indicate a sustained pattern yet.
    elif event_type == "sentiment_only_spike":
        signals.append({
            "text": "Short-term surge in student sentiment detected",
            "severity": "low"
        })

    # Deduplicate signals (e.g., multiple aspects declining may generate similar signals)
    # Keep unique signals and prioritize by severity, then limit to top 4 for clarity in reporting.
    seen = set()
    unique_signals = []

    for s in signals:
        if s["text"] not in seen:
            unique_signals.append(s)
            seen.add(s["text"])

    unique_signals.sort(
        key=lambda s: SEVERITY_ORDER.get(s["severity"], 99)
    )

    unique_signals = unique_signals[:4]

    # Business-friendly pattern generation (e.g., "Main concerns are related to X and Y")
    if negative_aspects:
        pattern = f"Main concerns are related to {', '.join(negative_aspects[:2])}."
    else:
        pattern = "No clear issue pattern detected yet."

    total_mentions = sum(
        a.get("count", 0) for a in aspect_summary.values()
    )

    return {
        "status": "computed",
        "signals": unique_signals,
        "pattern": pattern,
        "meta": reliability(
            sample_size=total_mentions,
            minimum=MIN_NEGATIVE_SIGNAL_POINTS
        )
    }


def get_positive_drivers(
    aspect_summary: dict,
    aspect_trends: dict,
    review_count: int
):
    """
    Identifies the aspect currently contributing the most positive value.
    
    Signals used:
    - Sentiment strength: higher sentiment = more positive
    - Frequency: more mentions = more important
    - Trend: improving trends increase positive signal
    
    NOTE: Confidence is moved to metadata (data quality indicator only).
    Score is scaled by confidence_factor to prevent over-interpretation of early-stage data.
    """
    config = POSITIVE_DRIVER_CONFIG
    min_required = config["reliability"]["min_aspect_mentions"]

    if not aspect_summary:
        return {
            "status": "no_data",
            "driver": None,
            "impact": None,
            "score": 0,
            "signals": [],
            "pattern": "Not enough data yet to identify positive drivers.",
            "meta": reliability(
                sample_size=0,
                minimum=min_required
            )
        }

    weights = config["weights"]
    trend_map = config["trend"]["mapping"]

    positive_scores = {}
    total_mentions = sum(a.get("count", 0) for a in aspect_summary.values())
    confidence_factor = _get_confidence_factor(total_mentions, min_required)

    for aspect, data in aspect_summary.items():

        avg_score = data.get("avg_score", 0.5)
        count = data.get("count", 0)

        # 1. Sentiment strength (core signal)
        sentiment_score = avg_score

        # 2. Frequency importance
        frequency_score = min(
            count / config["frequency"]["half_saturation_mentions"],
            1
        )

        # 3. Trend (normalized symmetric: improving 1.0, stable 0, declining -1.0)
        trend_label = aspect_trends.get(aspect, {}).get("trend", "stable")
        trend_score = trend_map.get(trend_label, 0)

        # FINAL SCORE (weights now exclude confidence)
        raw_score = (
            sentiment_score * weights["sentiment"] +
            frequency_score * weights["frequency"] +
            trend_score * weights["trend"]
        ) * 100

        # Apply confidence factor: early-stage data gets scaled down
        adjusted_score = raw_score * confidence_factor
        positive_scores[aspect] = max(0, min(100, adjusted_score))

    # Top driver
    driver = max(positive_scores, key=positive_scores.get)
    top_score = max(0, min(100, positive_scores[driver]))

    # Adaptive thresholds based on sample size
    adaptive_strong = _get_adaptive_positive_threshold(total_mentions, min_required)
    adaptive_moderate = config["thresholds"]["moderate_base"]

    if top_score >= adaptive_strong:
        impact = "STRONG"
    elif top_score >= adaptive_moderate:
        impact = "MODERATE"
    else:
        impact = "WEAK"

    # Business-friendly pattern (use dominance instead of hard threshold)
    # Only highlight aspects that are clearly positive relative to others
    avg_positive_score = sum(positive_scores.values()) / len(positive_scores) if positive_scores else 0
    strong_aspects = [
        aspect for aspect, score in positive_scores.items()
        if score > avg_positive_score * 0.8  # 80% of average = meaningfully positive
    ]

    if strong_aspects:
        pattern = f"Core strengths are in {', '.join(strong_aspects[:2])}."
    else:
        pattern = "Positive signals are present but not concentrated in specific areas."

    return {
        "status": "computed",
        "driver": driver,
        "impact": impact,
        "score": round(top_score, 2),
        "signals": strong_aspects[:4],
        "pattern": pattern,
        "meta": reliability(
            sample_size=total_mentions,
            minimum=min_required
        )
    }


def compute_aspect_intelligence(
    aspect_summary: dict,
    aspect_trends: dict,
    sentiment_volatility: dict,
):
    """
    Implements a 3-signal probability model for aspect-level intelligence:
    
    P(risk) + P(positive) + P(uncertain) = 1
    
    Each signal is computed independently:
    - Risk: negativity, declining trend, volatility, frequency
    - Positive: sentiment strength, improving trend, stability, frequency
    - Uncertainty: data scarcity, signal contradiction, volatility, weak trends
    
    Then normalized to probability space (independent sigmoid → softmax-like constraint).
    
    ACTION LOGIC: Uses DOMINANCE-BASED selection (no thresholds).
    Which signal is highest? That determines action (fix/leverage/monitor).
    This prevents false positives on small datasets where any single signal can exceed old thresholds.
    """
        
    config = ASPECT_INTELLIGENCE_CONFIG
    min_required = 1  # aspect-level intelligence works even with 1 mention (exploratory signal)

    if not aspect_summary:
        return {
            "status": "no_data",
            "aspects": {},
            "meta": reliability(0, 1)
        }

    # Use separate trend mappings for independent signal models
    health_trend_map = BUSINESS_HEALTH_CONFIG["trend"]["mapping"]
    pos_trend_map = POSITIVE_DRIVER_CONFIG["trend"]["mapping"]
    weights = config["weights"]

    results = {}
    total_mentions = sum(a.get("count", 0) for a in aspect_summary.values())
    confidence_factor = _get_confidence_factor(total_mentions, min_required)

    def _sigmoid(x):
        """Soft normalization (prevents hard saturation).
        
        NOTE: Sigmoid scaling constants (20, -5) are calibrated for typical aspect scores 0..1.
        If raw signals cluster too high or too low in production, adjust scale factor:
        - Increase scale (20 → 30) to spread distribution tighter around middle
        - Decrease scale (20 → 10) to push more toward extremes
        - Shift offset (-5 → -3) to move inflection point
        
        Dataset-dependent tuning: run validation on production data to confirm.
        """
        import math
        try:
            return 1.0 / (1.0 + math.exp(-x / 10.0))
        except OverflowError:
            return 1.0 if x > 0 else 0.0

    def _get_volatility_score(aspect):
        """Fetch aspect-level or global volatility, normalized 0..1."""
        if isinstance(sentiment_volatility, dict):
            per = sentiment_volatility.get(aspect)
            if isinstance(per, dict):
                return max(0.0, min(1.0, float(per.get("volatility", per.get("score", 0)))))
            top_vol = sentiment_volatility.get("volatility") or sentiment_volatility.get("volatility_score")
            if top_vol is not None:
                try:
                    return max(0.0, min(1.0, float(top_vol)))
                except Exception:
                    pass
        return 0.6 if sentiment_volatility.get("stability") == "unstable" else 0.15

    for aspect, data in aspect_summary.items():

        avg_score = data.get("avg_score", 0.5)
        count = data.get("count", 0)

        trend_label = aspect_trends.get(aspect, {}).get("trend", "stable")
        trend_value_health = health_trend_map.get(trend_label, 0)
        trend_value_pos = pos_trend_map.get(trend_label, 0)

        # =============================
        # SIGNAL NORMALIZATIONS
        # =============================
        negativity = max(0.0, min(1.0, 1 - float(avg_score)))
        sentiment_strength = max(0.0, min(1.0, float(avg_score)))
        frequency = min(count / config["frequency"]["half_saturation_mentions"], 1)
        volatility = _get_volatility_score(aspect)

        # Data scarcity (low sample = high uncertainty)
        data_scarcity = max(0.0, min(1.0, 1.0 - frequency))

        # Trend signals (independent per model)
        trend_declining = max(0.0, -trend_value_health)  # only negative = declining
        trend_improving = max(0.0, trend_value_pos)      # only positive = improving
        trend_strength = max(trend_declining, trend_improving)  # magnitude of trend
        trend_weakness = max(0.0, 1.0 - trend_strength)  # lack of clear direction

        # =============================
        # 1. RISK RAW (independent model)
        # =============================
        risk_raw = (
            negativity * weights["risk"]["negativity"] +
            trend_declining * weights["risk"]["trend"] +
            volatility * weights["risk"]["volatility"] +
            frequency * weights["risk"]["frequency"]
        )

        # =============================
        # 2. POSITIVE RAW (independent model)
        # =============================
        positive_raw = (
            sentiment_strength * weights["positive"]["sentiment"] +
            trend_improving * weights["positive"]["trend"] +
            (1 - volatility) * weights["positive"]["stability"]
        )

        # =============================
        # 3. UNCERTAINTY RAW (epistemic uncertainty)
        # =============================
        # Driven by: data scarcity, volatility, weak trend signal, mixed sentiment
        # NOTE: Mixed sentiment signal uses min(negativity, sentiment_strength) as heuristic.
        # This captures cases where both low and high scores are present (ambiguous/split opinion).
        # More sophisticated detection (e.g., bimodal distribution analysis) could replace this,
        # but this heuristic works well for MVP when aspect_summary provides aggregated avg_score.
        mixed_sentiment_signal = min(negativity, sentiment_strength)  # both high = ambiguous
        uncertainty_raw = (
            data_scarcity * 0.35 +  # low sample = high uncertainty
            mixed_sentiment_signal * 0.25 +  # mixed signals = unclear
            volatility * 0.25 +  # high volatility = unstable
            trend_weakness * 0.15  # weak trend = insufficient direction signal
        )

        # =============================
        # SOFT NORMALIZATION (sigmoid)
        # =============================
        # Sigmoid scaling: scale * 20, shift -5 calibrated for typical 0..1 raw scores.
        # See _sigmoid() docstring for tuning guidance if distribution is skewed in production.
        risk_norm = _sigmoid(risk_raw * 20 - 5)      # scale to sigmoid domain
        positive_norm = _sigmoid(positive_raw * 20 - 5)
        uncertain_norm = _sigmoid(uncertainty_raw * 20 - 5)

        # =============================
        # PROBABILITY NORMALIZATION
        # =============================
        total = risk_norm + positive_norm + uncertain_norm
        risk_prob = (risk_norm / total * 100) if total > 0 else 33.33
        positive_prob = (positive_norm / total * 100) if total > 0 else 33.33
        uncertain_prob = (uncertain_norm / total * 100) if total > 0 else 33.34

        # Apply confidence factor to emphasize uncertainty when sample is small
        # Early-stage data: more uncertainty is expressed
        # Mature data: confidence in measured probabilities increases
        adjusted_risk_prob = risk_prob * confidence_factor + uncertain_prob * (1 - confidence_factor)
        adjusted_positive_prob = positive_prob * confidence_factor + uncertain_prob * (1 - confidence_factor)
        adjusted_uncertain_prob = 100 - adjusted_risk_prob - adjusted_positive_prob

        # =============================
        # ACTION LOGIC (dominance-based, consistent with probability model)
        # =============================
        # In probability space, action is determined by which signal dominates.
        # This avoids absolute-threshold bias and aligns with P(risk) + P(positive) + P(uncertain) = 1 semantics.
        # NO THRESHOLDS: prevents false positives on small datasets.
        if adjusted_risk_prob >= adjusted_positive_prob and adjusted_risk_prob >= adjusted_uncertain_prob:
            action = "fix"
        elif adjusted_positive_prob >= adjusted_risk_prob and adjusted_positive_prob >= adjusted_uncertain_prob:
            action = "leverage"
        else:
            action = "monitor"

        results[aspect] = {
            "risk_score": round(adjusted_risk_prob, 2),
            "positive_score": round(adjusted_positive_prob, 2),
            "neutral_score": round(adjusted_uncertain_prob, 2),
            "action_priority": action
        }

    return {
        "status": "computed",
        "aspects": results,
        "meta": reliability(
            sample_size=total_mentions,
            minimum=1
        )
    }

import statistics

def get_sentiment_velocity(current_avg, historical_avg):
    """Calculates how fast sentiment is shifting."""
    velocity = current_avg - historical_avg
    return {
        "velocity": round(velocity, 3),
        "status": "accelerating_negativity" if velocity < -0.15 else "stable"
    }

def get_consensus_score(scores):
    """
    Calculates how unified students are in their sentiment.
    scores: List of individual sentiment scores (float 0.0 - 1.0)
    """
    if len(scores) < 2: 
        return 1.0 
    
    stdev = statistics.stdev(scores)
    # Higher consensus (1.0) means lower variance; low consensus (0.0) means high variance
    consensus = max(0, 1 - (stdev * 2)) 
    return round(consensus, 2)