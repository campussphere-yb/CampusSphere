# routers/connectors.py

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.connector import Connector
from app.schemas.connector import ConnectorCreate, ConnectorResponse, ConnectorUpdate

router = APIRouter(prefix="/connectors", tags=["Connectors"])


@router.post("/", response_model=ConnectorResponse, status_code=status.HTTP_201_CREATED)
def create_connector(payload: ConnectorCreate, db: Session = Depends(get_db)):
    connector = Connector(**payload.model_dump())
    db.add(connector)
    db.commit()
    db.refresh(connector)
    return connector


@router.get("/", response_model=list[ConnectorResponse])
def list_connectors(db: Session = Depends(get_db)):
    return db.query(Connector).order_by(Connector.name).all()


@router.get("/{connector_id}", response_model=ConnectorResponse)
def get_connector(connector_id: int, db: Session = Depends(get_db)):
    connector = db.query(Connector).filter(Connector.id == connector_id).first()
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found.")
    return connector


@router.patch("/{connector_id}", response_model=ConnectorResponse)
def update_connector(
    connector_id: int, payload: ConnectorUpdate, db: Session = Depends(get_db)
):
    connector = db.query(Connector).filter(Connector.id == connector_id).first()
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found.")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(connector, field, value)
    db.commit()
    db.refresh(connector)
    return connector


@router.delete("/{connector_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_connector(connector_id: int, db: Session = Depends(get_db)):
    connector = db.query(Connector).filter(Connector.id == connector_id).first()
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found.")
    db.delete(connector)
    db.commit()


@router.post("/{connector_id}/sync", response_model=ConnectorResponse)
def trigger_sync(connector_id: int, db: Session = Depends(get_db)):
    """
    Manually trigger a data pull for this connector.
    In production this would enqueue a background job. For now it just
    stamps last_synced_at so the UI can see the connector is responsive.
    """
    connector = db.query(Connector).filter(Connector.id == connector_id).first()
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found.")
    connector.last_synced_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(connector)
    return connector
