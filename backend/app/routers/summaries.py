# routers/summaries.py
# IMPORTANT: /summaries/latest is defined BEFORE /summaries/{id}
# so FastAPI doesn't try to cast "latest" as an integer.

import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.summary import Summary
from app.models.mention import Mention, SentimentLabel
from app.schemas.summary import SummaryGenerateRequest, SummaryResponse
from app.services.ai_service import generate_summary as ai_generate

router = APIRouter(prefix="/summaries", tags=["Summaries"])


@router.get("/latest", response_model=SummaryResponse)
def get_latest_summary(db: Session = Depends(get_db)):
    """Return the most recently generated summary of any type."""
    summary = db.query(Summary).order_by(Summary.created_at.desc()).first()
    if not summary:
        raise HTTPException(status_code=404, detail="No summaries generated yet.")
    return summary


@router.post("/generate", response_model=SummaryResponse, status_code=status.HTTP_201_CREATED)
def generate_summary(payload: SummaryGenerateRequest, db: Session = Depends(get_db)):
    """
    Compute aggregate stats for the requested period, then ask the AI
    to produce a narrative. Stores the result and returns it.
    """
    q = db.query(Mention).filter(
        Mention.created_at >= payload.period_start,
        Mention.created_at <= payload.period_end,
    )
    mentions = q.all()
    total = len(mentions)

    scored = [m for m in mentions if m.risk_score is not None]
    avg_risk = round(sum(m.risk_score for m in scored) / len(scored), 2) if scored else 0.0

    sentinented = [m for m in mentions if m.sentiment_score is not None]
    avg_sentiment = (
        round(sum(m.sentiment_score for m in sentinented) / len(sentinented), 3)
        if sentinented else 0.0
    )

    positive_count = sum(1 for m in mentions if m.sentiment_label == SentimentLabel.positive)
    neutral_count  = sum(1 for m in mentions if m.sentiment_label == SentimentLabel.neutral)
    negative_count = sum(1 for m in mentions if m.sentiment_label == SentimentLabel.negative)

    # Crude topic aggregation: collect all distinct topic hints from content keywords.
    from app.services.ai_service import analyze_mention as ai_analyze
    topic_counter: dict[str, int] = {}
    for m in mentions[:50]:  # cap at 50 to keep the request snappy in dev
        result = ai_analyze(m.content)
        for t in result.get("topics", []):
            topic_counter[t] = topic_counter.get(t, 0) + 1
    top_topics = sorted(topic_counter, key=topic_counter.get, reverse=True)[:5]

    ai_result = ai_generate(
        summary_type=payload.summary_type.value,
        period_start=payload.period_start,
        period_end=payload.period_end,
        total_mentions=total,
        avg_risk_score=avg_risk,
        avg_sentiment_score=avg_sentiment,
        positive_count=positive_count,
        neutral_count=neutral_count,
        negative_count=negative_count,
        top_topics=top_topics,
    )

    summary = Summary(
        summary_type=payload.summary_type,
        period_start=payload.period_start,
        period_end=payload.period_end,
        narrative=ai_result["narrative"],
        total_mentions=total,
        avg_risk_score=avg_risk,
        avg_sentiment_score=avg_sentiment,
        positive_count=positive_count,
        neutral_count=neutral_count,
        negative_count=negative_count,
        top_topics=json.dumps(top_topics),
        generated_by=ai_result["generated_by"],
    )
    db.add(summary)
    db.commit()
    db.refresh(summary)
    return summary


@router.get("/", response_model=list[SummaryResponse])
def list_summaries(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    return (
        db.query(Summary)
        .order_by(Summary.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{summary_id}", response_model=SummaryResponse)
def get_summary(summary_id: int, db: Session = Depends(get_db)):
    summary = db.query(Summary).filter(Summary.id == summary_id).first()
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found.")
    return summary


@router.delete("/{summary_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_summary(summary_id: int, db: Session = Depends(get_db)):
    summary = db.query(Summary).filter(Summary.id == summary_id).first()
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found.")
    db.delete(summary)
    db.commit()
