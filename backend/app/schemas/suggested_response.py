# schemas/suggested_response.py

from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.suggested_response import ResponseStatus


class SuggestedResponseCreate(BaseModel):
    mention_id: int
    content: str


class SuggestedResponseResponse(BaseModel):
    id: int
    mention_id: int
    content: str
    status: ResponseStatus
    generated_by: str
    approved_by: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


class SuggestedResponseUpdate(BaseModel):
    content: Optional[str] = None
    status: Optional[ResponseStatus] = None
    approved_by: Optional[int] = None
