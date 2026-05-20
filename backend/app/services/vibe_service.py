# Vibe summary service that computes an overall vibe score and label for the institution
# based on student confessions, and generates a concise natural-language summary of
# key insights using keyword extraction and optional LLM enhancement.

import datetime
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any

from backend.app.core.constants import (
    KEYWORD_EXTRACTION_TOP_N,
    MINIMUM_REVIEW_COUNT,
    POLARIZATION_MIN_RATIO,
    VIBE_LABELS,
    VIBE_THRESHOLDS,
)
from backend.app.core.ml_registry import MLRegistry
from backend.app.models.confession import Confession
from backend.app.services.sentiment_service import analyze_sentiment

# Module logger for debug/info messages (kept after imports)
logger = logging.getLogger(__name__)


async def get_confessions_with_scores(
    db: AsyncSession,
    as_of_date: datetime.datetime | None = None
) -> list[tuple]:
    """
    Fetches confessions along with their sentiment scores, optionally filtered
    by a cutoff date using post_date (the original Facebook post date).
    Returns a list of tuples containing (confession_content, sentiment_score).
    """
    # No business_id filter — confessions are institution-wide
    stmt = (
        select(Confession.content, Confession.sentiment_score)
        .where(Confession.sentiment_score.isnot(None))
    )

    if as_of_date is not None:
        # Use post_date for historical filtering, not imported_at
        stmt = stmt.where(Confession.post_date <= as_of_date)

    result = await db.execute(stmt)
    return result.all()


def compute_sentiment_scores(confessions_with_scores: list[tuple]) -> tuple[float, list[float]]:
    if not confessions_with_scores:
        return 0.0, []

    # compute average sentiment score across all confessions
    scores = [score for _, score in confessions_with_scores]
    avg_score = sum(scores) / len(scores)
    return avg_score, scores


def get_vibe_label(score: float) -> str:
    # Map continuous sentiment score into a discrete vibe label using thresholds
    if score >= VIBE_THRESHOLDS["high_positive"]:
        return VIBE_LABELS["high_positive"]
    elif score >= VIBE_THRESHOLDS["positive"]:
        return VIBE_LABELS["positive"]
    elif score >= VIBE_THRESHOLDS["neutral"]:
        return VIBE_LABELS["mixed"]
    elif score >= VIBE_THRESHOLDS["negative"]:
        return VIBE_LABELS["negative"]
    else:
        return VIBE_LABELS["high_negative"]


def extract_keywords(confessions: list[str], models: MLRegistry | None = None) -> list[str]:
    if not confessions:
        return []

    if models is None or models.keyword_extractor is None:
        return []

    text = " ".join(confessions)
    keywords = models.keyword_extractor.extract_keywords(
        text,
        keyphrase_ngram_range=(1, 2),
        stop_words="english",
        use_mmr=True,
        diversity=0.5,
        top_n=KEYWORD_EXTRACTION_TOP_N
    )
    # Return only the keyword terms (ignore extractor scores here)
    return [keyword for keyword, score in keywords]


def classify_keywords(keywords: list[str], models: MLRegistry) -> tuple[list[str], list[str]]:
    positive_keywords = []
    negative_keywords = []

    for keyword in keywords:
        # Classify each keyword's sentiment using the sentiment model
        score, label, confidence = analyze_sentiment(keyword, models.sentiment)
        # Only keep high-confidence classifications to avoid noisy signals
        if confidence < 0.75:
            continue
        if label == "positive":
            positive_keywords.append(keyword)
        else:
            negative_keywords.append(keyword)

    return positive_keywords, negative_keywords


def convert_sentiment_to_vibe_score(score: float) -> float:
    sentiment_normalized = (score + 1) / 2
    vibe_scale_0_to_4 = sentiment_normalized * 4
    vibe_score_1_to_5 = vibe_scale_0_to_4 + 1

    return round(vibe_score_1_to_5, 1)


def build_summary(
    label: str,
    score: float,
    count: int,
    positive_keywords: list[str],
    negative_keywords: list[str],
    llm_model: Any = None,
    use_ai_summary: bool = False
) -> str:

    # Create short human-readable summary from top keywords
    insight_parts = []
    if positive_keywords:
        insight_parts.append(f"Students frequently mention {', '.join(positive_keywords[:2])}")
    if negative_keywords:
        insight_parts.append(f"Some students noted recurring concerns about {', '.join(negative_keywords[:2])}")
    if not insight_parts:
        insight_parts.append("No strong themes detected")

    summary = ". ".join(p.capitalize() for p in insight_parts) + "."

    # Optionally rewrite summary using a provided LLM (kept disabled by default)
    if use_ai_summary:
        logger.info("Generating AI-enhanced summary")
        return enhance_summary_with_llm(summary, llm_model)

    return summary


# LLM enhancement to rewrite the summary in a more natural,
# concise way while preserving all factual information
# (DO NOT USE YET)
def enhance_summary_with_llm(
    summary: str,
    model: Any | None
) -> str:

    if model is None:
        return summary

    logger.info("Enhancing summary with LLM")

    try:
        prompt = f"""
                    You are a product copywriter.

                    Rewrite the following student confession summary to make it:
                    - natural and easy to read
                    - concise (2–3 sentences max)
                    - keep all factual information exactly the same
                    - do NOT add new information

                    Summary:
                    {summary}
                    """

        # Call into the model's chat API to rewrite the summary concisely
        response = model.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        content = response.choices[0].message.content

        if not content:
            return summary

        logger.info(f"LLM response: {content.strip()}")
        return content.strip()

    except Exception as e:
        logger.error(f"Error occurred while generating AI-enhanced summary: {e}")
        return summary


async def compute_vibe_summary(
    db: AsyncSession,
    models: MLRegistry,
    as_of_date: datetime.datetime | None = None,
    allow_insufficient_data: bool = False,
    use_ai_summary: bool = False
) -> dict:
    # business_id removed — confessions are institution-wide, not per business

    confessions_with_scores = await get_confessions_with_scores(db, as_of_date)

    logger.info(f"CONFESSIONS FOUND: {len(confessions_with_scores)}")
    logger.info(f"SAMPLE: {confessions_with_scores[:3]}")

    review_count = len(confessions_with_scores)

    if not allow_insufficient_data and review_count < MINIMUM_REVIEW_COUNT:
        return {
            "status": "insufficient_data",
            "review_count": review_count,
            "message": f"At least {MINIMUM_REVIEW_COUNT} confessions are needed to generate a vibe summary. Currently, there are {review_count} confessions."
        }

    if review_count == 0:
        return {
            "status": "insufficient_data",
            "review_count": review_count,
            "message": "No confessions available to generate a vibe summary."
        }

    # Aggregate sentiment metrics and map to a label
    avg_score, scores = compute_sentiment_scores(confessions_with_scores)
    label = get_vibe_label(avg_score)

    # Extract text content from confessions for keyword analysis
    confessions_text = [content for content, _ in confessions_with_scores]

    # Extract and classify keywords from the aggregated confession text
    positive_keywords, negative_keywords, keywords = _extract_classified_keywords(
        confessions_text,
        models,
    )

    # Build a concise summary string (optionally enhanced via LLM)
    summary = build_summary(
        label,
        avg_score,
        review_count,
        positive_keywords,
        negative_keywords,
        llm_model=models.large_language_model,
        use_ai_summary=use_ai_summary
    )

    # Count how many confessions fall into positive/negative buckets
    positive_count = sum(1 for score in scores if score > VIBE_THRESHOLDS["positive"])
    negative_count = sum(1 for score in scores if score < VIBE_THRESHOLDS["negative"])

    positive_ratio = positive_count / review_count
    negative_ratio = negative_count / review_count

    # Determine whether sentiment is polarized (significant counts at both ends)
    is_polarizing = (
        review_count > 0 and
        positive_ratio > POLARIZATION_MIN_RATIO and
        negative_ratio > POLARIZATION_MIN_RATIO
    )

    return {
        "avg_score": round(avg_score, 4),
        "vibe_score": convert_sentiment_to_vibe_score(avg_score),
        "vibe_label": label,
        "keywords": keywords,
        "positive_keywords": positive_keywords,
        "negative_keywords": negative_keywords,
        "summary_text": summary,
        "review_count": review_count,
        "score_distribution": {
            "positive": positive_count,
            "negative": negative_count,
            "is_polarizing": is_polarizing
        }
    }


async def compute_vibe_keywords(
    db: AsyncSession,
    models: MLRegistry,
    as_of_date: datetime.datetime | None = None,
    allow_insufficient_data: bool = False,
    confessions_with_scores: list[tuple[str, float]] | None = None,
) -> dict:

    if confessions_with_scores is None:
        confessions_with_scores = await get_confessions_with_scores(db, as_of_date)

    review_count = len(confessions_with_scores)

    if not allow_insufficient_data and review_count < MINIMUM_REVIEW_COUNT:
        return {
            "status": "insufficient_data",
            "review_count": review_count,
            "positive_keywords": [],
            "negative_keywords": [],
            "message": (
                f"At least {MINIMUM_REVIEW_COUNT} confessions are needed to extract "
                f"vibe keywords. Currently, there are {review_count} confessions."
            ),
        }

    if review_count == 0:
        return {
            "status": "insufficient_data",
            "review_count": review_count,
            "positive_keywords": [],
            "negative_keywords": [],
            "message": "No confessions available to extract vibe keywords.",
        }

    confessions_text = [content for content, _ in confessions_with_scores]
    positive_keywords, negative_keywords, _ = _extract_classified_keywords(
        confessions_text,
        models,
    )

    return {
        "status": "ok",
        "review_count": review_count,
        "positive_keywords": positive_keywords,
        "negative_keywords": negative_keywords,
    }


def _extract_classified_keywords(
    confessions_text: list[str],
    models: MLRegistry,
) -> tuple[list[str], list[str], list[str]]:
    keywords = extract_keywords(confessions_text, models)
    positive_keywords, negative_keywords = classify_keywords(keywords, models)
    return positive_keywords, negative_keywords, keywords