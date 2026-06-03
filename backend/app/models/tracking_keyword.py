# models/tracking_keyword.py
# Keywords watched across all monitored platforms.
# category options: brand | crisis | reputation | general

from datetime import datetime
from sqlalchemy import String, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class TrackingKeyword(Base):
    __tablename__ = "tracking_keywords"

    id:         Mapped[int]      = mapped_column(primary_key=True, index=True)
    keyword:    Mapped[str]      = mapped_column(String(200), unique=True, index=True)
    category:   Mapped[str]      = mapped_column(String(50), default="general")
    is_active:  Mapped[bool]     = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
