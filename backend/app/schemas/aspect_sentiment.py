from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AspectSentimentBase(BaseModel):
    confession_id: int
    sentence: str

    aspect: str
    sentiment_label: str
    sentiment_score: float

    aspect_confidence: float
    sentiment_confidence: float


class AspectSentimentResponse(AspectSentimentBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AspectMiniResponse(BaseModel):
    aspect: str
    sentiment_label: str