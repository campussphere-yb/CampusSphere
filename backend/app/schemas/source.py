# schemas/source.py

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class SourceCreate(BaseModel):
    name: str           # "Twitter/X"
    platform_key: str   # "twitter" — lowercase slug used internally
    base_url: Optional[str] = None
    is_active: bool = True


class SourceResponse(BaseModel):
    id: int
    name: str
    platform_key: str
    base_url: Optional[str]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class SourceUpdate(BaseModel):
    name: Optional[str] = None
    base_url: Optional[str] = None
    is_active: Optional[bool] = None
