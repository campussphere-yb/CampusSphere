# models/suggested_response.py
# An AI-generated draft response to a specific mention.
# Lifecycle: draft → (edited by analyst) → approved → sent
#                                         → rejected

import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ResponseStatus(str, enum.Enum):
    draft = "draft"
    approved = "approved"
    sent = "sent"
    rejected = "rejected"


class SuggestedResponse(Base):
    __tablename__ = "suggested_responses"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    mention_id: Mapped[int] = mapped_column(ForeignKey("mentions.id"), index=True)
    content: Mapped[str] = mapped_column(Text)
    status: Mapped[ResponseStatus] = mapped_column(
        SAEnum(ResponseStatus), default=ResponseStatus.draft
    )
    generated_by: Mapped[str] = mapped_column(String(100), default="mock-ai")
    # Tracks which analyst approved/rejected this response.
    approved_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
