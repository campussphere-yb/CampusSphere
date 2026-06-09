# models/app_setting.py
# Simple persistent key-value store for app-level configuration flags.
#
# Used by seed.py to record whether the initial demo seed has been run.
# Because this table lives in PostgreSQL it survives redeploys — so
# seed_if_empty() will never overwrite user data once the flag is set.

from datetime import datetime
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AppSetting(Base):
    __tablename__ = "app_settings"

    key:        Mapped[str]      = mapped_column(String(100), primary_key=True)
    value:      Mapped[str]      = mapped_column(String(1000))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
