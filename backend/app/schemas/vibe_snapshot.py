from datetime import datetime
from pydantic import BaseModel, ConfigDict


class VibeSnapshotBase(BaseModel):
    business_id: int
    vibe_score: float
    vibe_label: str
    review_count: int

    positive_count: int
    negative_count: int

    summary_text: str

    snapshot_date: datetime


class VibeSnapshotResponse(VibeSnapshotBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VibeSnapshotMiniResponse(BaseModel):
    vibe_score: float
    vibe_label: str
    review_count: int
    summary_text: str
    positive_count: int
    negative_count: int
    
