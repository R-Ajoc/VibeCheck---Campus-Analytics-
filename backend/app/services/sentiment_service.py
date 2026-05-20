from transformers import Pipeline

def analyze_sentiment(text: str, sentiment_pipeline: Pipeline) -> tuple[float, str, float]:
    result = sentiment_pipeline(text, truncation=True, max_length=512)[0]

    raw_label = result["label"]
    confidence = float(result["score"])

    # Normalize label to lowercase meaning
    if raw_label == "NEGATIVE":
        label = "negative"
        polarity_score = -confidence
    elif raw_label == "POSITIVE":
        label = "positive"
        polarity_score = confidence
    else:
        # fallback (just in case model changes or edge cases appear)
        label = "neutral"
        polarity_score = 0.0

    return polarity_score, label, confidence


# For seed data or batch processing, we can use a batch version of the sentiment analysis
def analyze_sentiment_batch(texts: list[str], sentiment_pipeline: Pipeline) -> list[tuple[float, str, float]]:
    results = sentiment_pipeline(texts, truncation=True, max_length=512)

    outputs = []

    for r in results:
        raw_label = r["label"]
        confidence = float(r["score"])

        if raw_label == "NEGATIVE":
            label = "negative"
            polarity_score = -confidence
        elif raw_label == "POSITIVE":
            label = "positive"
            polarity_score = confidence
        else:
            label = "neutral"
            polarity_score = 0.0

        outputs.append((polarity_score, label, confidence))

    return outputs