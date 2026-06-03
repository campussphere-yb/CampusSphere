# schemas/mention.py

from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.mention import SentimentLabel, RiskLevel, MentionStatus


class SourceBrief(BaseModel):
    """Minimal source info embedded in mention responses — avoids separate API call."""
    id:           int
    name:         str
    platform_key: str
    model_config = {"from_attributes": True}


class MentionCreate(BaseModel):
    connector_id:    int
    source_id:       int
    external_id:     Optional[str]  = None
    content:         str
    author_handle:   Optional[str]  = None
    url:             Optional[str]  = None
    published_at:    Optional[datetime] = None
    # Pre-populated if the ingest pipeline already ran AI analysis.
    sentiment_score: Optional[float]          = None
    sentiment_label: Optional[SentimentLabel] = None
    risk_score:      Optional[float]          = None
    risk_level:      Optional[RiskLevel]      = None
    topics:          Optional[str]            = None   # JSON-encoded list
    department_id:   Optional[int]            = None
    notes:           Optional[str]            = None


class MentionResponse(BaseModel):
    id:              int
    connector_id:    int
    source_id:       int
    external_id:     Optional[str]
    content:         str
    author_handle:   Optional[str]
    url:             Optional[str]
    published_at:    Optional[datetime]
    sentiment_score: Optional[float]
    sentiment_label: Optional[SentimentLabel]
    risk_score:      Optional[float]
    risk_level:      Optional[RiskLevel]
    topics:          Optional[str]            # JSON-encoded list e.g. '["athletics","finance"]'
    status:          MentionStatus
    department_id:   Optional[int]
    notes:           Optional[str]
    created_at:      datetime
    # Nested source — populated via lazy="joined" relationship on the ORM model.
    source:          Optional[SourceBrief] = None

    model_config = {"from_attributes": True}


class MentionUpdate(BaseModel):
    """Used by analysts to triage — update status, assign a department, add notes, or adjust AI scores."""
    status:          Optional[MentionStatus]  = None
    department_id:   Optional[int]            = None
    risk_score:      Optional[float]          = None
    risk_level:      Optional[RiskLevel]      = None
    sentiment_score: Optional[float]          = None
    sentiment_label: Optional[SentimentLabel] = None
    topics:          Optional[str]            = None
    notes:           Optional[str]            = None
