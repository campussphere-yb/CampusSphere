# schemas/alert.py

from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.alert import AlertType, AlertSeverity, AlertStatus


class AlertCreate(BaseModel):
    title: str
    description: Optional[str] = None
    alert_type: AlertType
    severity: AlertSeverity = AlertSeverity.warning
    mention_id: Optional[int] = None
    assigned_to: Optional[int] = None


class AlertResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    alert_type: AlertType
    severity: AlertSeverity
    status: AlertStatus
    mention_id: Optional[int]
    assigned_to: Optional[int]
    resolved_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class AlertUpdate(BaseModel):
    status: Optional[AlertStatus] = None
    assigned_to: Optional[int] = None
    description: Optional[str] = None
