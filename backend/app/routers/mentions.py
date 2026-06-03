# routers/mentions.py — core resource of CampusSphere.

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.mention import Mention, MentionStatus, RiskLevel, SentimentLabel
from app.models.suggested_response import SuggestedResponse
from app.schemas.mention import MentionCreate, MentionResponse, MentionUpdate
from app.schemas.suggested_response import SuggestedResponseResponse
from app.services.ai_service import suggest_response as ai_suggest

router = APIRouter(prefix="/mentions", tags=["Mentions"])


@router.post("/", response_model=MentionResponse, status_code=status.HTTP_201_CREATED)
def ingest_mention(payload: MentionCreate, db: Session = Depends(get_db)):
    """
    Ingest a new mention. Called by connectors or a webhook.
    If sentiment/risk is not pre-populated, POST to /ai/analyze first.
    """
    mention = Mention(**payload.model_dump())
    db.add(mention)
    db.commit()
    db.refresh(mention)
    return mention


@router.get("/", response_model=list[MentionResponse])
def list_mentions(
    source_id: Optional[int] = None,
    risk_level: Optional[RiskLevel] = None,
    sentiment_label: Optional[SentimentLabel] = None,
    status: Optional[MentionStatus] = None,
    department_id: Optional[int] = None,
    date_from: Optional[datetime] = Query(default=None),
    date_to: Optional[datetime] = Query(default=None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """
    List mentions with optional filters.
    All filters are combinable — e.g. risk_level=high&source_id=2&status=new.
    """
    q = db.query(Mention)
    if source_id is not None:
        q = q.filter(Mention.source_id == source_id)
    if risk_level is not None:
        q = q.filter(Mention.risk_level == risk_level)
    if sentiment_label is not None:
        q = q.filter(Mention.sentiment_label == sentiment_label)
    if status is not None:
        q = q.filter(Mention.status == status)
    if department_id is not None:
        q = q.filter(Mention.department_id == department_id)
    if date_from is not None:
        q = q.filter(Mention.created_at >= date_from)
    if date_to is not None:
        q = q.filter(Mention.created_at <= date_to)
    return q.order_by(Mention.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{mention_id}", response_model=MentionResponse)
def get_mention(mention_id: int, db: Session = Depends(get_db)):
    mention = db.query(Mention).filter(Mention.id == mention_id).first()
    if not mention:
        raise HTTPException(status_code=404, detail="Mention not found.")
    return mention


@router.patch("/{mention_id}", response_model=MentionResponse)
def update_mention(mention_id: int, payload: MentionUpdate, db: Session = Depends(get_db)):
    """Update status, assign a department, or adjust AI scores manually."""
    mention = db.query(Mention).filter(Mention.id == mention_id).first()
    if not mention:
        raise HTTPException(status_code=404, detail="Mention not found.")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(mention, field, value)
    db.commit()
    db.refresh(mention)
    return mention


@router.delete("/{mention_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mention(mention_id: int, db: Session = Depends(get_db)):
    mention = db.query(Mention).filter(Mention.id == mention_id).first()
    if not mention:
        raise HTTPException(status_code=404, detail="Mention not found.")
    db.delete(mention)
    db.commit()


# ── Nested suggested-response routes ─────────────────────────────────────────

@router.get("/{mention_id}/suggested-responses", response_model=list[SuggestedResponseResponse])
def list_mention_responses(mention_id: int, db: Session = Depends(get_db)):
    """All suggested responses generated for a specific mention."""
    if not db.query(Mention).filter(Mention.id == mention_id).first():
        raise HTTPException(status_code=404, detail="Mention not found.")
    return (
        db.query(SuggestedResponse)
        .filter(SuggestedResponse.mention_id == mention_id)
        .order_by(SuggestedResponse.created_at.desc())
        .all()
    )


@router.post(
    "/{mention_id}/suggested-responses",
    response_model=SuggestedResponseResponse,
    status_code=status.HTTP_201_CREATED,
)
def generate_mention_response(mention_id: int, db: Session = Depends(get_db)):
    """Ask the AI to generate a new suggested response for this mention."""
    mention = db.query(Mention).filter(Mention.id == mention_id).first()
    if not mention:
        raise HTTPException(status_code=404, detail="Mention not found.")

    result = ai_suggest(
        mention_content=mention.content,
        sentiment_label=mention.sentiment_label.value if mention.sentiment_label else "neutral",
    )
    response = SuggestedResponse(
        mention_id=mention_id,
        content=result["content"],
        generated_by=result["generated_by"],
    )
    db.add(response)
    db.commit()
    db.refresh(response)
    return response
