# This module contains functions to perform Aspect-Based Sentiment Analysis (ABSA) on confessions.
# ABSA identifies specific aspects (e.g. "academics", "mental_health", "faculty") mentioned in confessions
# and determines the sentiment expressed towards each aspect.

from __future__ import annotations

import re
from typing import List, Tuple

import numpy as np
from sentence_transformers import util
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.aspects import ASPECT_KEYWORDS, ASPECTS
from backend.app.core.constants import (
    AND_SPLIT_LONG_SENTENCE_SIZE,
    AND_SPLIT_THRESHOLD_LONG,
    AND_SPLIT_THRESHOLD_SHORT,
    MIN_CLAUSE_LENGTH,
    MIN_SENTIMENT_CONFIDENCE,
    MIN_SPLIT_PART_LENGTH,
    SIMILARITY_THRESHOLD,
)
from backend.app.core.ml_registry import MLRegistry
from backend.app.models.aspect_sentiment import AspectSentiment
from backend.app.models.confession import Confession
from backend.app.services.sentiment_service import analyze_sentiment


# Prepare aspect keys and keywords for efficient access in ABSA functions
ASPECT_KEYS = list(ASPECTS.keys())

# flatten all aspect keywords into a single set for quick lookup 
# during smart splitting and aspect detection
ALL_ASPECT_KEYWORDS = {
    keyword for keywords in ASPECT_KEYWORDS.values()
    for keyword in keywords
}


async def get_confession_aspects(db: AsyncSession, confession_id: int) -> List[AspectSentiment]:
    """
    Retrieve aspect-sentiment records for a given confession.
    """
    stmt = select(AspectSentiment).where(
        AspectSentiment.confession_id == confession_id
    )

    result = await db.execute(stmt)
    return result.scalars().all()


# ------------------
# ABSA Core Logic
# ------------------

def smart_comma_split(clause: str) -> List[str]:
    """
    Splits a text clause on commas when they likely separate distinct opinion units.

    Avoids splitting in cases where commas are part of natural phrasing, descriptive lists,
    or stylistic pauses that do not represent separate semantic units.

    Uses a simple heuristic (presence of common linking verbs) to decide whether the clause
    should be split or preserved as a single unit.
    """
    parts = [p.strip() for p in clause.split(",")]

    if len(parts) <= 1:
        return [clause]

    # only split if first part has a verb (very simple heuristic)
    if any(v in clause.lower() for v in ["is", "was", "are", "were", "looks", "feels"]):
        return parts

    return [clause]

def smart_and_split(clause: str) -> List[str]:
    """
    Splits on "and" only when it likely separates distinct aspect-based opinions,
    using keyword overlap and length-based thresholds to avoid over-splitting.
    """
    parts = re.split(r"\band\b", clause, flags=re.IGNORECASE)

    if len(parts) <= 1:
        return [clause]

    # Clean segments
    cleaned_parts = [p.strip() for p in parts if p.strip()]

    # Check how many segments contain aspect keywords
    matched_parts = sum(
        1
        for part in cleaned_parts
        if set(re.findall(r"\b\w+\b", part.lower())) & ALL_ASPECT_KEYWORDS
    )

    # Choose threshold based on sentence length
    if len(cleaned_parts) >= AND_SPLIT_LONG_SENTENCE_SIZE:
        threshold = AND_SPLIT_THRESHOLD_LONG
    else:
        threshold = AND_SPLIT_THRESHOLD_SHORT

    # Split only if enough segments are aspect-relevant
    if (matched_parts / len(cleaned_parts)) >= threshold:
        return [p for p in cleaned_parts if len(p) >= MIN_SPLIT_PART_LENGTH]

    return [clause]

    

def split_sentences(text: str) -> List[str]:
    """ 
    Splits review text into sentences and clauses using a combination of punctuation 
    and conjunctions, while applying heuristics to avoid over-splitting and maintain aspect-sentiment integrity.
    """
    text = re.sub(r"\s+", " ", text).strip()

    # split into sentences first
    sentences = re.split(r"(?<=[.!?])\s+", text)

    final_clauses = []

    # split each sentence into clauses
    for s in sentences:
        s = s.strip()
        if len(s) < MIN_CLAUSE_LENGTH:
            continue
        # apply smart comma splitting and then smart "and" splitting to each sentence
        clauses = re.split(
            r"\bbut\b|\bhowever\b|\bthough\b|\balthough\b|\byet\b",
            s,
            flags=re.IGNORECASE
        )
        for c in clauses:
            c = c.strip()
            if len(c) < MIN_CLAUSE_LENGTH:
                continue
            
            # apply smart comma splitting and then smart "and" splitting to each clause
            for sub in smart_comma_split(c):
                for final_sub in smart_and_split(sub):
                    if len(final_sub) >= MIN_CLAUSE_LENGTH:
                        final_clauses.append(final_sub)

    return final_clauses


def strong_match_boost(sentence, aspect) -> bool:
    """
    Checks if the sentence contains strong keywords related to the aspect, 
    which can boost confidence in aspect detection even if similarity is borderline.
    """
    keywords = ASPECT_KEYWORDS[aspect]
    return any(k in sentence.lower() for k in keywords)


def detect_aspects(sentence: str, models: MLRegistry) -> List[Tuple[str, float]]:
    """
    Detects relevant aspects mentioned in a sentence using cosine similarity between
    sentence embeddings and predefined aspect embeddings, with heuristics to boost confidence for strong keyword matches.
    """
    if models.aspect_embeddings is None:
        raise ValueError("aspect_embeddings not initialized")

    # encode the sentence using the same embedding model used for aspect embeddings
    embedding = models.embedding.encode(sentence, convert_to_tensor=True)

    # compute cosine similarity between sentence embedding and aspect embeddings
    aspect_similarity = util.cos_sim(embedding, models.aspect_embeddings)[0]
    aspect_similarity = aspect_similarity.cpu().numpy()

    results = []

    # only consider aspects that exceed the similarity threshold, or have a strong keyword match
    for i, score in enumerate(aspect_similarity):
        aspect = ASPECT_KEYS[i]

        if score < SIMILARITY_THRESHOLD:
            # if similarity is below threshold, we can still consider it if there's a strong keyword match
            continue

        if score < 0.5 and not strong_match_boost(sentence, aspect):
            # if the similarity is low and there's no strong keyword match, skip this aspect
            continue

        results.append((aspect, float(score)))

    if not results:
        return [("general", float(np.max(aspect_similarity)))]

    return results


async def run_absa_for_confession(
    db: AsyncSession,
    confession: Confession,
    models: MLRegistry
) -> List[AspectSentiment]:
    """
    Runs ABSA on a single confession by splitting it into sentences and clauses,
    detecting aspects for each clause, and analyzing sentiment for each aspect-clause pair.
    Saves the aspect-sentiment records to the database and returns them as a list.
    """
    if confession.id is None:
        await db.flush()

    sentences = split_sentences(confession.content)
    results: List[AspectSentiment] = []

    seen_aspects = set() 

    # iterate through each sentence/clause and perform aspect detection and sentiment analysis
    for sentence in sentences:

        detected_aspects = detect_aspects(sentence, models)

        for aspect, aspect_confidence in detected_aspects:

            if aspect == "general":
                continue

            # if we've already recorded an aspect for this review, 
            # we can skip it to avoid duplicates
            if aspect in seen_aspects:
                continue
            seen_aspects.add(aspect)

            # combine aspect and sentence for aspect-specific sentiment analysis
            aspect_text = f"{aspect}: {sentence}"

            sentiment_score, sentiment_label, sentiment_confidence = analyze_sentiment(
                aspect_text,
                models.sentiment
            )

            # only save aspect-sentiment pairs that have a strong sentiment 
            # confidence to ensure quality of ABSA results
            if sentiment_confidence < MIN_SENTIMENT_CONFIDENCE:
                continue

            record = AspectSentiment(
                confession_id=confession.id,
                sentence=sentence,
                aspect=aspect,
                sentiment_label=sentiment_label,
                sentiment_score=sentiment_score,
                aspect_confidence=aspect_confidence,
                sentiment_confidence=sentiment_confidence,
            )

            db.add(record)
            results.append(record)

    # write overall sentiment back to the confession row
    if results:
        avg_score = sum(r.sentiment_score for r in results) / len(results)
        dominant_label = max(
            {"positive", "negative", "neutral"},
            key=lambda l: sum(1 for r in results if r.sentiment_label == l)
        )
        confession.sentiment_score = avg_score
        confession.sentiment_label = dominant_label
        db.add(confession)

    return results