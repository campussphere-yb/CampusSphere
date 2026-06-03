# models/summary.py
# An AI-generated digest covering a specific time period.
# Stores both the narrative text and the underlying aggregate statistics
# so the frontend can render charts without re-querying raw mentions.

import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, Float, Integer, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SummaryType(str, enum.Enum):
    weekly = "weekly"
    executive = "executive"
    monthly = "monthly"


class Summary(Base):
    __tablename__ = "summaries"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    summary_type: Mapped[SummaryType] = mapped_column(SAEnum(SummaryType))
    period_start: Mapped[datetime] = mapped_column(DateTime)
    period_end: Mapped[datetime] = mapped_column(DateTime)

    # AI-generated narrative paragraph(s).
    narrative: Mapped[str] = mapped_column(Text)

    # Aggregate statistics for the period.
    total_mentions: Mapped[int] = mapped_column(Integer, default=0)
    avg_risk_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    avg_sentiment_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    positive_count: Mapped[int] = mapped_column(Integer, default=0)
    neutral_count: Mapped[int] = mapped_column(Integer, default=0)
    negative_count: Mapped[int] = mapped_column(Integer, default=0)

    # JSON-encoded list of topic strings, e.g. '["admissions","athletics","finance"]'
    # Stored as text for SQLite compatibility; parse with json.loads() when reading.
    top_topics: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    generated_by: Mapped[str] = mapped_column(String(100), default="mock-ai")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
