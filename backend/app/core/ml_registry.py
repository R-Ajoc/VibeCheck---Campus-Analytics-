
from dataclasses import dataclass

from sentence_transformers import SentenceTransformer
from transformers import Pipeline
from numpy.typing import NDArray
from keybert import KeyBERT
from typing import Any

@dataclass
# This class serves as a centralized registry for ML models and related resources,
# allowing for easy access and management throughout the application.
class MLRegistry:
    sentiment: Pipeline
    embedding: SentenceTransformer
    aspect_embeddings: NDArray | None = None
    keyword_extractor: KeyBERT | None = None
    large_language_model: Any | None = None 