# routers/alerts.py
# IMPORTANT: the /alerts/open route is defined BEFORE /alerts/{alert_id}
# so FastAPI does not try to interpret the literal string "open" as an integer ID.

from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.alert import Alert, AlertStatus, AlertSeverity, AlertType
from app.schemas.alert import AlertCreate, AlertResponse, AlertUpdate

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("/open", response_model=list[AlertResponse])
def list_open_alerts(db: Session = Depends(get_db)):
    """Shortcut — all alerts that have not yet been resolved."""
    return (
        db.query(Alert)
        .filter(Alert.status != AlertStatus.resolved)
        .order_by(Alert.created_at.desc())
        .all()
    )


@router.post("/", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
def create_alert(payload: AlertCreate, db: Session = Depends(get_db)):
    alert = Alert(**payload.model_dump())
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


@router.get("/", response_model=list[AlertResponse])
def list_alerts(
    severity: Optional[AlertSeverity] = None,
    status: Optional[AlertStatus] = None,
    alert_type: Optional[AlertType] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    q = db.query(Alert)
    if severity:
        q = q.filter(Alert.severity == severity)
    if status:
        q = q.filter(Alert.status == status)
    if alert_type:
        q = q.filter(Alert.alert_type == alert_type)
    return q.order_by(Alert.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")
    return alert


@router.patch("/{alert_id}", response_model=AlertResponse)
def update_alert(alert_id: int, payload: AlertUpdate, db: Session = Depends(get_db)):
    """Acknowledge or resolve an alert. Sets resolved_at automatically when resolving."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(alert, field, value)
    # Auto-stamp resolved_at when status is moved to resolved.
    if payload.status == AlertStatus.resolved and not alert.resolved_at:
        alert.resolved_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(alert)
    return alert


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")
    db.delete(alert)
    db.commit()
