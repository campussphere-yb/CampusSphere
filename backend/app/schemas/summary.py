# schemas/summary.py

from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.summary import SummaryType


class SummaryGenerateRequest(BaseModel):
    summary_type: SummaryType
    period_start: datetime
    period_end: datetime


class SummaryResponse(BaseModel):
    id: int
    summary_type: SummaryType
    period_start: datetime
    period_end: datetime
    narrative: str
    total_mentions: int
    avg_risk_score: Optional[float]
    avg_sentiment_score: Optional[float]
    positive_count: int
    neutral_count: int
    negative_count: int
    # JSON string, e.g. '["admissions","athletics"]' — parse with json.loads() in the frontend
    top_topics: Optional[str]
    generated_by: str
    created_at: datetime

    model_config = {"from_attributes": True}
