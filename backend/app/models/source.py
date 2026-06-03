# models/source.py
# A monitored platform type — Twitter/X, Reddit, Instagram, news outlets, etc.
# Sources are the "what kind of place" layer; Connectors are the actual integrations.

from datetime import datetime
from typing import Optional
from sqlalchemy import String, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Source(Base):
    __tablename__ = "sources"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)          # "Twitter/X"
    platform_key: Mapped[str] = mapped_column(String(50), unique=True, index=True)  # "twitter"
    base_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
