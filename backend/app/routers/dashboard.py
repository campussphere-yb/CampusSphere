# routers/dashboard.py — read-only aggregates for the frontend dashboard.
# All routes are GET-only. No data is written here.

import json
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.mention import Mention, SentimentLabel, RiskLevel, MentionStatus
from app.models.alert import Alert, AlertStatus
from app.models.source import Source
from app.schemas.mention import MentionResponse
from app.schemas.alert import AlertResponse
from app.services.ai_service import generate_insight

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/overview")
def overview(db: Session = Depends(get_db)):
    """
    Top-line numbers for the dashboard header strip.
    Returns total mentions, open alert count, avg risk score, sentiment breakdown,
    risk breakdown, and derived counts (high_risk, positive_pct, resolved, new).
    """
    total_mentions = db.query(func.count(Mention.id)).scalar() or 0
    open_alerts = (
        db.query(func.count(Alert.id))
        .filter(Alert.status != AlertStatus.resolved)
        .scalar() or 0
    )
    avg_risk_row = (
        db.query(func.avg(Mention.risk_score))
        .filter(Mention.risk_score.isnot(None))
        .scalar()
    )
    avg_risk = round(float(avg_risk_row), 2) if avg_risk_row is not None else None

    sentiment_breakdown = {
        label.value: (
            db.query(func.count(Mention.id))
            .filter(Mention.sentiment_label == label)
            .scalar() or 0
        )
        for label in SentimentLabel
    }

    risk_breakdown = {
        level.value: (
            db.query(func.count(Mention.id))
            .filter(Mention.risk_level == level)
            .scalar() or 0
        )
        for level in RiskLevel
    }

    # Derived convenience counts used by stat cards
    high_risk_count = risk_breakdown.get("critical", 0) + risk_breakdown.get("high", 0)
    positive_count  = sentiment_breakdown.get("positive", 0)
    positive_pct    = round(positive_count / max(total_mentions, 1) * 100)
    new_mentions    = (
        db.query(func.count(Mention.id))
        .filter(Mention.status == MentionStatus.new)
        .scalar() or 0
    )
    resolved_count  = (
        db.query(func.count(Mention.id))
        .filter(Mention.status == MentionStatus.resolved)
        .scalar() or 0
    )

    return {
        "total_mentions":     total_mentions,
        "open_alerts":        open_alerts,
        "avg_risk_score":     avg_risk,
        "sentiment_breakdown": sentiment_breakdown,
        "risk_breakdown":     risk_breakdown,
        # Derived fields for stat cards
        "high_risk_count":    high_risk_count,
        "positive_pct":       positive_pct,
        "positive_count":     positive_count,
        "new_mentions":       new_mentions,
        "resolved_count":     resolved_count,
    }


@router.get("/counts")
def badge_counts(db: Session = Depends(get_db)):
    """
    Lightweight endpoint for sidebar badge counts.
    Called once on sidebar mount to show unread mention and open alert counts.
    """
    new_mentions = (
        db.query(func.count(Mention.id))
        .filter(Mention.status == MentionStatus.new)
        .scalar() or 0
    )
    open_alerts = (
        db.query(func.count(Alert.id))
        .filter(Alert.status != AlertStatus.resolved)
        .scalar() or 0
    )
    return {"new_mentions": new_mentions, "open_alerts": open_alerts}


@router.get("/ai-insight")
def ai_insight(db: Session = Depends(get_db)):
    """
    Executive AI insight for the dashboard hero banner.
    Generates a short narrative based on current mention data and top topics.
    Falls back gracefully when the DB is empty.
    """
    total_mentions = db.query(func.count(Mention.id)).scalar() or 0
    avg_risk_row = (
        db.query(func.avg(Mention.risk_score))
        .filter(Mention.risk_score.isnot(None))
        .scalar()
    )
    avg_risk = round(float(avg_risk_row), 2) if avg_risk_row else 0.0

    positive_count = (
        db.query(func.count(Mention.id))
        .filter(Mention.sentiment_label == SentimentLabel.positive)
        .scalar() or 0
    )
    negative_count = (
        db.query(func.count(Mention.id))
        .filter(Mention.sentiment_label == SentimentLabel.negative)
        .scalar() or 0
    )
    neutral_count = (
        db.query(func.count(Mention.id))
        .filter(Mention.sentiment_label == SentimentLabel.neutral)
        .scalar() or 0
    )

    # Aggregate topic tags from all mentions
    topic_counts: dict[str, int] = {}
    rows = db.query(Mention.topics).filter(Mention.topics.isnot(None)).all()
    for (topics_str,) in rows:
        try:
            for t in json.loads(topics_str):
                topic_counts[t] = topic_counts.get(t, 0) + 1
        except Exception:
            pass
    top_topics = [t for t, _ in sorted(topic_counts.items(), key=lambda x: -x[1])[:5]]

    return generate_insight(
        total_mentions, avg_risk,
        positive_count, negative_count, neutral_count,
        top_topics,
    )


@router.get("/trending-topics")
def trending_topics(
    limit: int = Query(default=6, ge=1, le=20),
    db: Session = Depends(get_db),
):
    """
    Top topics by mention volume, derived from AI-tagged topics on each mention.
    Returns [{topic, count, sentiment_label, avg_sentiment}].
    """
    topic_counts:     dict[str, int]        = {}
    topic_sentiments: dict[str, list[float]] = {}

    rows = (
        db.query(Mention.topics, Mention.sentiment_score)
        .filter(Mention.topics.isnot(None))
        .all()
    )
    for topics_str, sentiment_score in rows:
        try:
            for t in json.loads(topics_str):
                topic_counts[t] = topic_counts.get(t, 0) + 1
                if sentiment_score is not None:
                    topic_sentiments.setdefault(t, []).append(sentiment_score)
        except Exception:
            pass

    result = []
    for topic, count in sorted(topic_counts.items(), key=lambda x: -x[1])[:limit]:
        scores = topic_sentiments.get(topic, [0.0])
        avg_sent = sum(scores) / max(len(scores), 1)
        sentiment_label = (
            "positive" if avg_sent > 0.2
            else "negative" if avg_sent < -0.2
            else "neutral"
        )
        result.append({
            "topic":           topic,
            "count":           count,
            "sentiment_label": sentiment_label,
            "avg_sentiment":   round(avg_sent, 3),
        })
    return result


@router.get("/risk-trend")
def risk_trend(
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
):
    """
    Daily average risk score over the last N days.
    Returns [{date, avg_risk, mention_count}] — ready to feed into a line chart.
    """
    since = datetime.utcnow() - timedelta(days=days)
    rows = (
        db.query(
            func.strftime("%Y-%m-%d", Mention.created_at).label("date"),
            func.avg(Mention.risk_score).label("avg_risk"),
            func.count(Mention.id).label("mention_count"),
        )
        .filter(Mention.created_at >= since, Mention.risk_score.isnot(None))
        .group_by(func.strftime("%Y-%m-%d", Mention.created_at))
        .order_by("date")
        .all()
    )
    return [
        {
            "date":          r.date,
            "avg_risk":      round(float(r.avg_risk), 2) if r.avg_risk else 0.0,
            "mention_count": r.mention_count,
        }
        for r in rows
    ]


@router.get("/top-sources")
def top_sources(limit: int = Query(default=5, ge=1, le=20), db: Session = Depends(get_db)):
    """
    Which platforms are generating the most mentions.
    Returns [{source_id, platform_name, platform_key, mention_count, pct}].
    """
    total = db.query(func.count(Mention.id)).scalar() or 1
    rows = (
        db.query(
            Mention.source_id,
            func.count(Mention.id).label("mention_count"),
        )
        .group_by(Mention.source_id)
        .order_by(func.count(Mention.id).desc())
        .limit(limit)
        .all()
    )
    result = []
    for r in rows:
        source = db.query(Source).filter(Source.id == r.source_id).first()
        result.append({
            "source_id":     r.source_id,
            "platform_name": source.name if source else "Unknown",
            "platform_key":  source.platform_key if source else "unknown",
            "mention_count": r.mention_count,
            "pct":           round(r.mention_count / total * 100),
        })
    return result


@router.get("/recent-mentions", response_model=list[MentionResponse])
def recent_mentions(limit: int = Query(default=10, ge=1, le=50), db: Session = Depends(get_db)):
    """Latest N mentions for the live feed panel."""
    return (
        db.query(Mention)
        .order_by(Mention.created_at.desc())
        .limit(limit)
        .all()
    )


@router.get("/recent-alerts", response_model=list[AlertResponse])
def recent_alerts(limit: int = Query(default=10, ge=1, le=50), db: Session = Depends(get_db)):
    """Latest open/acknowledged alerts for the alert banner."""
    return (
        db.query(Alert)
        .filter(Alert.status != AlertStatus.resolved)
        .order_by(Alert.created_at.desc())
        .limit(limit)
        .all()
    )
