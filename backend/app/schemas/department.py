# schemas/department.py

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    contact_email: Optional[str] = None


class DepartmentResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    contact_email: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    contact_email: Optional[str] = None
