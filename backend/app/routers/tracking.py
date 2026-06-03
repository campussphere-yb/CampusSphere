# routers/tracking.py
# Manages tracking keywords and exposes source monitoring toggles.
#
# Endpoints:
#   GET    /tracking/keywords          list all keywords
#   POST   /tracking/keywords          add a keyword
#   PATCH  /tracking/keywords/{id}     update (toggle active, rename, change category)
#   DELETE /tracking/keywords/{id}     remove a keyword

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.tracking_keyword import TrackingKeyword
from app.schemas.tracking_keyword import (
    TrackingKeywordCreate,
    TrackingKeywordUpdate,
    TrackingKeywordResponse,
)

router = APIRouter(prefix="/tracking", tags=["Tracking"])


# ── Keywords ──────────────────────────────────────────────────────────────────

@router.get("/keywords", response_model=list[TrackingKeywordResponse])
def list_keywords(db: Session = Depends(get_db)):
    return db.query(TrackingKeyword).order_by(TrackingKeyword.created_at.desc()).all()


@router.post("/keywords", response_model=TrackingKeywordResponse, status_code=status.HTTP_201_CREATED)
def create_keyword(payload: TrackingKeywordCreate, db: Session = Depends(get_db)):
    if db.query(TrackingKeyword).filter(TrackingKeyword.keyword == payload.keyword).first():
        raise HTTPException(status_code=409, detail="Keyword already exists.")
    kw = TrackingKeyword(**payload.model_dump())
    db.add(kw)
    db.commit()
    db.refresh(kw)
    return kw


@router.patch("/keywords/{kw_id}", response_model=TrackingKeywordResponse)
def update_keyword(kw_id: int, payload: TrackingKeywordUpdate, db: Session = Depends(get_db)):
    kw = db.query(TrackingKeyword).filter(TrackingKeyword.id == kw_id).first()
    if not kw:
        raise HTTPException(status_code=404, detail="Keyword not found.")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(kw, field, value)
    db.commit()
    db.refresh(kw)
    return kw


@router.delete("/keywords/{kw_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_keyword(kw_id: int, db: Session = Depends(get_db)):
    kw = db.query(TrackingKeyword).filter(TrackingKeyword.id == kw_id).first()
    if not kw:
        raise HTTPException(status_code=404, detail="Keyword not found.")
    db.delete(kw)
    db.commit()
