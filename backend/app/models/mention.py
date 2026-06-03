# models/mention.py
# A single captured post, article, tweet, or comment that mentions the university.
# Carries sentiment analysis, risk scoring, topic tags, and can be routed to a department.

import enum
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Text, Float, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.source import Source


class SentimentLabel(str, enum.Enum):
    positive = "positive"
    neutral  = "neutral"
    negative = "negative"


class RiskLevel(str, enum.Enum):
    low      = "low"
    medium   = "medium"
    high     = "high"
    critical = "critical"


class MentionStatus(str, enum.Enum):
    new       = "new"
    reviewed  = "reviewed"
    escalated = "escalated"
    resolved  = "resolved"
    ignored   = "ignored"


class Mention(Base):
    __tablename__ = "mentions"

    id:          Mapped[int]           = mapped_column(primary_key=True, index=True)
    connector_id: Mapped[int]          = mapped_column(ForeignKey("connectors.id"))
    source_id:   Mapped[int]           = mapped_column(ForeignKey("sources.id"))

    # The original post ID on the external platform (for deduplication).
    external_id: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, index=True)

    content:       Mapped[str]           = mapped_column(Text)
    author_handle: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    url:           Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    published_at:  Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # ── Sentiment — populated by the AI analysis pipeline ──────────────────────
    sentiment_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # -1.0 to +1.0
    sentiment_label: Mapped[Optional[SentimentLabel]] = mapped_column(
        SAEnum(SentimentLabel), nullable=True
    )

    # ── Risk — numeric for charts, categorical for filters/alerts ──────────────
    risk_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)   # 0.0 to 10.0
    risk_level: Mapped[Optional[RiskLevel]] = mapped_column(
        SAEnum(RiskLevel), nullable=True
    )

    # ── AI topic tags (JSON array stored as Text: '["athletics","finance"]') ───
    topics: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Workflow state and routing ─────────────────────────────────────────────
    status: Mapped[MentionStatus] = mapped_column(
        SAEnum(MentionStatus), default=MentionStatus.new
    )
    department_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("departments.id"), nullable=True
    )

    # ── Internal analyst notes — never published externally ───────────────────
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # ── Relationships ──────────────────────────────────────────────────────────
    # lazy="joined" means every mention query automatically includes source info
    # so we never need a separate roundtrip to get platform name/key.
    source: Mapped[Optional["Source"]] = relationship(
        "Source", foreign_keys=[source_id], lazy="joined"
    )
