from pathlib import Path

PASSWORD_HASH_ITERATIONS = 100_000
HOURS_BETWEEN_SNAPSHOTS = 24
DEFAULT_USER_ROLE = "admin"
SUPERADMIN_ROLE = "superadmin"

PROJECT_ROOT = Path(__file__).resolve().parents[3]
UPLOADS_DIR = PROJECT_ROOT / "uploads"

# --------------------------
# VIBE SUMMARY CONSTANTS
# --------------------------

VIBE_THRESHOLDS = {
    "high_positive": 0.8,
    "positive": 0.3,
    "neutral": -0.3,
    "negative": -0.8,
}

VIBE_LABELS = {
    "high_positive": "Highly Positive",
    "positive": "Positive",
    "mixed": "Mixed",
    "negative": "Negative",
    "high_negative": "Highly Negative"
}


VIBE_LABEL_CONFIG = {
    "thresholds": {
        "very_positive": 4.5,
        "positive": 4.0,
        "slightly_positive": 3.5,
        "mixed": 3.0,
        "slightly_negative": 2.5,
        "negative": 2.0,
        "very_negative": 1.5
    }
}

VIBE_UI_MAP = {
    "high_positive": {"type": "stable", "ui_label": "Highly Positive"},
    "positive": {"type": "stable", "ui_label": "Positive"},
    "mixed": {"type": "warning", "ui_label": "Mixed"},
    "negative": {"type": "alert", "ui_label": "Negative"},
    "high_negative": {"type": "alert", "ui_label": "Highly Negative"},
}


# number of keywords to extract for vibe summaries (can be adjusted based on desired summary length and detail)
KEYWORD_EXTRACTION_TOP_N = 8

# used to determine if a business is considered "neutral" in vibe, 
# which can affect how we present the summary
VIBE_NEUTRAL_LOW = VIBE_THRESHOLDS["negative"]
VIBE_NEUTRAL_HIGH = VIBE_THRESHOLDS["positive"]

# used to identify if a business has a polarizing vibe (significant mix of positive and negative reviews)
POLARIZATION_MIN_RATIO = 0.3 

# Minimum number of reviews required to compute a vibe summary
MINIMUM_REVIEW_COUNT = 3 

# --------------------------
# ABSA CONSTANTS
# --------------------------

# used in ABSA to determine if a sentence is relevant to an aspect
SIMILARITY_THRESHOLD = 0.30 

# used in ABSA to filter out low-confidence sentiment predictions, 
# which can help improve overall aspect sentiment accuracy
MIN_SENTIMENT_CONFIDENCE = 0.5

# minimum number of characters for a clause to be considered valid
MIN_CLAUSE_LENGTH = 8 

# thresholds for smart "and" splitting in ABSA to avoid 
#  over-splitting short clauses that may not contain multiple aspects
AND_SPLIT_THRESHOLD_SHORT = 0.5
AND_SPLIT_THRESHOLD_LONG = 0.6
AND_SPLIT_LONG_SENTENCE_SIZE = 3

# minimum length for split parts when using smart "and" splitting to avoid creating very short fragments
MIN_SPLIT_PART_LENGTH = 4


# --------------------------
# ANALYTICS CONSTANTS
# --------------------------

# Thresholds for determining overall business health and UI presentation
BUSINESS_HEALTH_CONFIG = {
    "trend": {
        "mapping": {
            "improving": 1,
            "stable": 0.8,
            "declining": -1,
            "insufficient_data": 0
        }
    },

    "weights": {
        "vibe": 0.4,
        "trend": 0.25,
        "alignment": 0.2,
        "confidence": 0.15
    },

    "cold_start_weights": {
        "vibe": 0.7,
        "alignment": 0.3
    },

    "aspects": {
        "min_aspects": 2,
        "default_alignment": 0.5,
        "stability_sensitivity": 2.0
    },

    "confidence": {
        "half_saturation_reviews": 10,
        "min_score": 15,
        "low_weight": 0.3,
        "mid_weight": 0.7
    },

    "data_quality_weights": {
        "no_data": 0.3,
        "very_low": 0.5,
        "low": 0.7,
        "moderate": 0.9,
        "high": 1.0
    }
}


STABILITY_CONFIG = {
    "thresholds": {
        "sentiment_volatility": 0.35,
        "vibe_volatility": 0.30
    },

    "bands": {
        "stable": 0.5,
        "mixed": 1.0
    }
}



PRIMARY_RISK_DRIVER_CONFIG = {
    "weights": {
        "negativity": 0.45, # most important signal for risk
        "frequency": 0.3, # more mentions = more important
        "trend": 0.25 # declining trends increase risk, improving trends decrease risk
        # NOTE: confidence moved to metadata only (data quality indicator, not a signal)
    },

    "trend": {
        "mapping": {
            "improving": -1.0, # improving trends strongly reduce risk (normalized symmetric)
            "stable": 0.0, # stable trends have no impact on risk
            "declining": 1.0, # declining trends increase risk (normalized symmetric)
            "insufficient_data": 0.0
        }
    },

    "thresholds": {
        # ADAPTIVE: these baselines scale based on sample_size
        # see _get_adaptive_risk_threshold() in insights_service
        "high_impact_base": 70,
        "medium_impact_base": 40,
        "low_impact": 0
    },

    "frequency": {
        "half_saturation_mentions": 10 # after 10 mentions, frequency score is maxed out
    },

    "reliability": {
        "min_aspect_mentions": 5 # minimum samples required for reliable assessment
    }
}


POSITIVE_DRIVER_CONFIG = {
    "weights": {
        "sentiment": 0.5,
        "frequency": 0.2,
        "trend": 0.3
        # NOTE: confidence moved to metadata only (data quality indicator, not a signal)
    },

    "trend": {
        "mapping": {
            "improving": 1.0, # improving trends increase positive signal (normalized symmetric)
            "stable": 0.0, # stable trends have no impact
            "declining": -1.0, # declining trends reduce positive signal (normalized symmetric)
            "insufficient_data": 0.0
        }
    },

    "thresholds": {
        # ADAPTIVE: these baselines scale based on sample_size
        # see _get_adaptive_positive_threshold() in insights_service
        "strong_base": 70,
        "moderate_base": 40,
        "weak": 0
    },

    "frequency": {
        "half_saturation_mentions": 10
    },

    "reliability": {
        "min_aspect_mentions": 5 # minimum samples required for reliable assessment
    }
}

# Negative Signal Thresholds for identifying specific risk signals in reviews (used in insights and analytics)
MIN_NEGATIVE_SIGNAL_POINTS = 5 

ASPECT_INTELLIGENCE_CONFIG = {
    "weights": {
        "risk": {
            "negativity": 0.45,
            "trend": 0.3,
            "volatility": 0.15,
            "frequency": 0.1
        },
        "positive": {
            "sentiment": 0.5,
            "trend": 0.3,
            "stability": 0.2
        }
    },

    "frequency": {
        "half_saturation_mentions": 10
    }
    
    # NOTE: action logic uses DOMINANCE-BASED selection, not thresholds
    # thresholds removed to prevent false positives on small datasets
    # See compute_aspect_intelligence() for dominance logic
}


# Sentiment Thresholds

MIN_SENTIMENT_TIMESERIES_POINTS = 5
MIN_SENTIMENT_DISTRIBUTION_REVIEWS = 5
MIN_SENTIMENT_TREND_POINTS = 5
MIN_REVIEW_VOLUME_POINTS = 5

# Sentiment trend thresholds (slope values for determining positive/negative trends)
SENTIMENT_TREND_POSITIVE_THRESHOLD = 0.01
SENTIMENT_TREND_NEGATIVE_THRESHOLD = -0.01

# Volatility thresholds
MIN_SENTIMENT_VOLATILITY_POINTS = 5
VOLATILITY_STABLE_THRESHOLD = 0.3

# Peak and drop detection thresholds
MIN_PEAK_DROP_POINTS = 5

# Vibe forecast thresholds
MIN_VIBE_FORECAST_POINTS = 6
FUTURE_FORECAST_MONTHS = 6
MIN_VIBE_SCORE = 1.0
MAX_VIBE_SCORE = 5.0

VIBE_POSITIVE_THRESHOLD = 3.5
VIBE_NEGATIVE_THRESHOLD = 2.5

# Aspect summary thresholds
MIN_ASPECT_COUNT = 5

ABSA_POSITIVE_THRESHOLD = 0.2
ABSA_NEGATIVE_THRESHOLD = -0.2

# Vibe score time series reliability threshold
MIN_VIBE_TIMESERIES_POINTS = 7

# Vibe trend thresholds
MIN_VIBE_TREND_POINTS = 7

VIBE_TREND_POSITIVE_SLOPE_THRESHOLD = 0.01
VIBE_TREND_NEGATIVE_SLOPE_THRESHOLD = -0.01

# Vibe trend score thresholds (for comparing vibe score values, not slopes)
VIBE_TREND_POSITIVE_THRESHOLD = 3.5
VIBE_TREND_NEGATIVE_THRESHOLD = 2.5

# Vibe volatility thresholds
MIN_VIBE_VOLATILITY_POINTS = 5


# --------------------------
# Review Event Detection Constants
# --------------------------

EMA_ALPHA = 0.3

# Minimum number of recent reviews for velocity to be considered reliable
MIN_REVIEW_VELOCITY_POINTS = 5

Z_SCORE_SENTIMENT_THRESHOLD = 1.5
Z_SCORE_VOLUME_THRESHOLD = 1.5

CONFIDENCE_SENTIMENT_WEIGHT = 40
CONFIDENCE_VOLUME_WEIGHT = 40

MIN_SPIKE_DATA_POINTS = 3