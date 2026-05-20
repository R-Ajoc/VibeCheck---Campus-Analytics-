from pydantic import BaseModel


class TemporalPoint(BaseModel):
    period: str
    avg_score: float
    count: int