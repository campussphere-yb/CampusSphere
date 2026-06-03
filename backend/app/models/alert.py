# models/alert.py
# Triggered automatically (risk spike, sentiment drop, volume surge) or manually.
# Alerts can be linked to a specific mention or raised independently.

import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AlertType(str, enum.Enum):
    risk_spike = "risk_spike"          # a mention (or cluster) hit a high risk threshold
    sentiment_drop = "sentiment_drop"  # rolling sentiment fell sharply
    volume_surge = "volume_surge"      # unusual spike in mention volume
    keyword_match = "keyword_match"    # a watched keyword was detected
    manual = "manual"                  # created by a human analyst


class AlertSeverity(str, enum.Enum):
    info = "info"
    warning = "warning"
    critical = "critical"


class AlertStatus(str, enum.Enum):
    open = "open"
    acknowledged = "acknowledged"
    resolved = "resolved"


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    alert_type: Mapped[AlertType] = mapped_column(SAEnum(AlertType))
    severity: Mapped[AlertSeverity] = mapped_column(
        SAEnum(AlertSeverity), default=AlertSeverity.warning
    )
    status: Mapped[AlertStatus] = mapped_column(
        SAEnum(AlertStatus), default=AlertStatus.open
    )
    # Optional link to the triggering mention.
    mention_id: Mapped[Optional[int]] = mapped_column(ForeignKey("mentions.id"), nullable=True)
    # Optional assignment to an analyst.
    assigned_to: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
