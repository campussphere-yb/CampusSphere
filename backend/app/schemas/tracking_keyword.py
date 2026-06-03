# schemas/tracking_keyword.py

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class TrackingKeywordCreate(BaseModel):
    keyword:   str
    category:  str  = "general"
    is_active: bool = True


class TrackingKeywordUpdate(BaseModel):
    keyword:   Optional[str]  = None
    category:  Optional[str]  = None
    is_active: Optional[bool] = None


class TrackingKeywordResponse(BaseModel):
    id:         int
    keyword:    str
    category:   str
    is_active:  bool
    created_at: datetime

    model_config = {"from_attributes": True}
