# routers/ai.py — direct AI capability endpoints.
# These are called by the frontend for on-demand analysis, separate from the
# automated pipeline that runs when a mention is ingested.

from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel

from app.services.ai_service import (
    analyze_mention,
    suggest_response,
    generate_summary,
)

router = APIRouter(prefix="/ai", tags=["AI"])


# ── /ai/analyze ───────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    text: str


class AnalyzeResponse(BaseModel):
    sentiment_score: float
    sentiment_label: str
    risk_score: float
    risk_level: str
    topics: list[str]
    source: str


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(payload: AnalyzeRequest):
    """
    Analyze a piece of text for sentiment, risk, and topic tags.
    Useful for previewing scores before ingesting a mention.

    Example:
        { "text": "Students are protesting the university's handling of the discrimination complaint." }
    """
    result = analyze_mention(payload.text)
    return AnalyzeResponse(**result, source="mock-ai")


# ── /ai/suggest-response ─────────────────────────────────────────────────────

class SuggestRequest(BaseModel):
    content: str                           # the mention text to respond to
    sentiment_label: Optional[str] = "neutral"


class SuggestResponse(BaseModel):
    content: str
    generated_by: str
    tone: str
    word_count: int


@router.post("/suggest-response", response_model=SuggestResponse)
def suggest(payload: SuggestRequest):
    """
    Generate a draft public response for a given piece of mention text.
    The /mentions/{id}/suggested-responses endpoint calls this internally;
    use this endpoint to test the AI directly without persisting anything.
    """
    result = suggest_response(
        mention_content=payload.content,
        sentiment_label=payload.sentiment_label or "neutral",
    )
    return SuggestResponse(**result)


# ── /ai/generate-summary ─────────────────────────────────────────────────────

from datetime import datetime


class SummaryRequest(BaseModel):
    summary_type: str = "weekly"
    period_start: datetime
    period_end: datetime
    total_mentions: int = 0
    avg_risk_score: float = 0.0
    avg_sentiment_score: float = 0.0
    positive_count: int = 0
    neutral_count: int = 0
    negative_count: int = 0
    top_topics: list[str] = []


class SummaryAIResponse(BaseModel):
    narrative: str
    generated_by: str


@router.post("/generate-summary", response_model=SummaryAIResponse)
def generate(payload: SummaryRequest):
    """
    Generate a narrative summary from pre-computed stats.
    For the full pipeline (auto-compute stats + persist), use POST /summaries/generate.
    This endpoint is for previewing narrative output without storing anything.
    """
    result = generate_summary(**payload.model_dump())
    return SummaryAIResponse(**result)
