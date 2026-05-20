from backend.app.core.constants import STABILITY_CONFIG, VIBE_LABEL_CONFIG

def map_vibe_score(score: float) -> str:
    cfg = VIBE_LABEL_CONFIG["thresholds"]

    if score >= cfg["very_positive"]:
        return "very_positive"
    elif score >= cfg["positive"]:
        return "positive"
    elif score >= cfg["slightly_positive"]:
        return "slightly_positive"
    elif score >= cfg["mixed"]:
        return "mixed"
    elif score >= cfg["slightly_negative"]:
        return "slightly_negative"
    elif score >= cfg["negative"]:
        return "negative"
    else:
        return "very_negative"
    



def map_stability(volatility: float, metric: str, data_points: int):
    """
    Maps raw volatility values to stability labels and interpretation messages.
    """

    threshold = STABILITY_CONFIG["thresholds"].get(metric, 0.3)  # Default threshold if metric not found

    # Bands for categorizing stability levels
    bands = STABILITY_CONFIG["bands"]

    # Reliability guard for very low data points
    if data_points == 0:
        return {
            "label": "insufficient_data",
            "message": "Not enough data to assess stability."
        }

    # Determine stability level based on volatility and predefined thresholds
    if volatility < threshold * bands["stable"]:
        level = "stable"
    elif volatility < threshold * bands["mixed"]:
        level = "mixed"
    else:
        level = "unstable"

    # Interpretation messages based on metric and stability level
    if metric == "sentiment_volatility":
        messages = {
            "stable": "Customer sentiment is consistent over time.",
            "mixed": "Some fluctuations detected in customer sentiment.",
            "unstable": "Customer sentiment is highly inconsistent."
        }

    elif metric == "vibe_volatility":
        messages = {
            "stable": "Vibe is steady over time.",
            "mixed": "Vibe is showing moderate fluctuations.",
            "unstable": "Vibe is fluctuating over time."
        }

    else:
        messages = {
            "stable": "Stability is consistent over time.",
            "mixed": "Some fluctuations detected in the data.",
            "unstable": "High inconsistency detected in the data."
        }

    return {
        "label": level,
        "message": messages[level]
    }


def map_vibe_time_series(rows):
    return [
        {
            "date": r["period"],
            "value": round(r["avg_score"], 2)
        }
        for r in rows
    ]

def map_peak_drop_event(event, event_type: str):
    if not event:
        return None

    magnitude = abs(event.get("change", 0))

    if magnitude >= 0.6:
        impact = "High"
    elif magnitude >= 0.3:
        impact = "Medium"
    else:
        impact = "Low"

    if event_type == "peak":
        title = "Best Improvement Day"

        if impact == "High":
            summary = "Customer experience improved sharply compared to the previous day."
            action = "Review what drove this improvement and reinforce it."
        elif impact == "Medium":
            summary = "Noticeable improvement in customer experience was detected."
            action = "Identify what likely contributed to the positive shift."
        else:
            summary = "Small improvement in customer experience observed."
            action = "Monitor if this trend continues."
    else:
        title = "Biggest Decline Day"

        if impact == "High":
            summary = "Customer experience dropped sharply compared to the previous day."
            action = "Investigate potential issues immediately."
        elif impact == "Medium":
            summary = "Noticeable decline in customer experience was detected."
            action = "Review recent feedback for recurring complaints."
        else:
            summary = "Small decline in customer experience observed."
            action = "Keep monitoring for patterns."

    return {
        "title": title,
        "date": event.get("date"),
        "summary": summary,
        "impact": impact,
        "action": action,
        "change": round(event.get("change", 0), 2),
        "previous_score": round(event.get("previous_score", 0), 2),
        "current_score": round(event.get("current_score", 0), 2),
    }