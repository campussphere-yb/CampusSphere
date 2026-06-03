# routers/suggested_responses.py — standalone response queue / review screen.
# Complements the nested /mentions/{id}/suggested-responses routes.

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.suggested_response import SuggestedResponse, ResponseStatus
from app.schemas.suggested_response import SuggestedResponseResponse, SuggestedResponseUpdate

router = APIRouter(prefix="/suggested-responses", tags=["Suggested Responses"])


@router.get("/", response_model=list[SuggestedResponseResponse])
def list_suggested_responses(
    status: Optional[ResponseStatus] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """
    List all suggested responses across all mentions.
    Filter by status to build a review queue, e.g.:
        GET /suggested-responses?status=draft
    """
    q = db.query(SuggestedResponse)
    if status:
        q = q.filter(SuggestedResponse.status == status)
    return q.order_by(SuggestedResponse.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{response_id}", response_model=SuggestedResponseResponse)
def get_suggested_response(response_id: int, db: Session = Depends(get_db)):
    obj = db.query(SuggestedResponse).filter(SuggestedResponse.id == response_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Suggested response not found.")
    return obj


@router.patch("/{response_id}", response_model=SuggestedResponseResponse)
def update_suggested_response(
    response_id: int, payload: SuggestedResponseUpdate, db: Session = Depends(get_db)
):
    """Edit content, approve, reject, or mark as sent."""
    obj = db.query(SuggestedResponse).filter(SuggestedResponse.id == response_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Suggested response not found.")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{response_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_suggested_response(response_id: int, db: Session = Depends(get_db)):
    obj = db.query(SuggestedResponse).filter(SuggestedResponse.id == response_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Suggested response not found.")
    db.delete(obj)
    db.commit()
