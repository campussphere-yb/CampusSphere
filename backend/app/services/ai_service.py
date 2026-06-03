# services/ai_service.py — mocked AI engine for CampusSphere.
#
# Four capabilities exposed to the routers:
#   1. analyze_mention    → sentiment score/label + risk score/level + topic tags
#   2. suggest_response   → draft a public reply to a mention
#   3. generate_summary   → produce a narrative digest for a reporting period
#   4. generate_insight   → short executive insight for the dashboard hero banner
#
# All results use keyword matching + light randomisation to feel realistic in dev.
# To wire in a real LLM (Claude, GPT-4, etc.) later:
#   → replace the body of each function below
#   → the signatures and return shapes stay the same, so nothing else changes.

import random
from datetime import datetime


# ── Sentiment analysis ────────────────────────────────────────────────────────

_NEGATIVE_KEYWORDS = [
    "scandal", "unsafe", "protest", "riot", "lawsuit", "accused",
    "crisis", "fired", "expelled", "racist", "discrimination",
    "assault", "fraud", "failed", "corrupt", "outrage", "danger",
    "threat", "violent", "harass", "abuse", "negligence",
]
_POSITIVE_KEYWORDS = [
    "award", "congratulations", "outstanding", "proud", "excellent",
    "innovative", "achievement", "scholarship", "celebrated", "won",
    "ranked", "best", "leading", "success", "impressive", "record",
    "launch", "partnership", "grant", "honour", "recognized",
]


def _classify_sentiment(text: str) -> tuple[float, str]:
    """Returns (sentiment_score in [-1.0, 1.0], sentiment_label)."""
    lower = text.lower()
    neg_hits = sum(1 for kw in _NEGATIVE_KEYWORDS if kw in lower)
    pos_hits = sum(1 for kw in _POSITIVE_KEYWORDS if kw in lower)

    if neg_hits > pos_hits:
        score = round(random.uniform(-0.90, -0.30), 3)
        label = "negative"
    elif pos_hits > neg_hits:
        score = round(random.uniform(0.30, 0.95), 3)
        label = "positive"
    else:
        score = round(random.uniform(-0.15, 0.20), 3)
        label = "neutral"
    return score, label


def _classify_risk(text: str, sentiment_score: float) -> tuple[float, str]:
    """Returns (risk_score in [0.0, 10.0], risk_level enum string)."""
    lower = text.lower()
    high_risk_words = [
        "lawsuit", "scandal", "assault", "fraud", "riot", "protest",
        "expelled", "fired", "crisis", "corrupt", "danger", "unsafe",
        "negligence", "abuse", "threat", "harass",
    ]
    keyword_hits = sum(1 for kw in high_risk_words if kw in lower)
    base = min(keyword_hits * 2.0, 7.0)
    # Negative sentiment amplifies risk; positive sentiment dampens it slightly.
    sentiment_adjustment = max(0.0, -sentiment_score * 3.0)
    raw = round(min(base + sentiment_adjustment + random.uniform(0.0, 1.5), 10.0), 2)

    if raw >= 8.0:
        level = "critical"
    elif raw >= 5.5:
        level = "high"
    elif raw >= 3.0:
        level = "medium"
    else:
        level = "low"
    return raw, level


_TOPIC_MAP = {
    "admissions":    ["admit", "admission", "applicant", "enroll", "accepted", "rejected", "waitlist"],
    "athletics":     ["football", "basketball", "athlete", "coach", "team", "sport", "game", "ncaa"],
    "finance":       ["tuition", "fee", "scholarship", "debt", "financial aid", "cost", "bursar"],
    "campus safety": ["safe", "unsafe", "assault", "crime", "police", "emergency", "lockdown"],
    "diversity":     ["racist", "discrimination", "inclusion", "diversity", "equity", "bias", "dei"],
    "academics":     ["professor", "grade", "course", "research", "faculty", "degree", "curriculum"],
    "administration":["president", "dean", "board", "policy", "decision", "provost", "leadership"],
    "housing":       ["dorm", "housing", "residence", "roommate", "off-campus", "evict"],
    "mental health": ["mental health", "counseling", "anxiety", "depression", "wellness", "suicide"],
}


def analyze_mention(text: str) -> dict:
    """
    Analyze raw text for sentiment, risk, and topic tags.

    Returns
    -------
    dict with keys:
        sentiment_score  float     –1.0 to +1.0
        sentiment_label  str       positive | neutral | negative
        risk_score       float     0.0 to 10.0
        risk_level       str       low | medium | high | critical
        topics           list[str]
    """
    sentiment_score, sentiment_label = _classify_sentiment(text)
    risk_score, risk_level = _classify_risk(text, sentiment_score)

    lower = text.lower()
    topics = [
        topic
        for topic, keywords in _TOPIC_MAP.items()
        if any(kw in lower for kw in keywords)
    ]
    if not topics:
        topics = ["general"]

    return {
        "sentiment_score": sentiment_score,
        "sentiment_label": sentiment_label,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "topics": topics,
    }


# ── Response suggestion ───────────────────────────────────────────────────────

_RESPONSE_TEMPLATES: dict[str, list[str]] = {
    "negative": [
        (
            "Thank you for bringing this to our attention. We take all concerns seriously "
            "and are actively reviewing the matter. For direct assistance, please contact "
            "our Communications Office at communications@university.edu."
        ),
        (
            "We appreciate your feedback and understand your concerns. Our team is "
            "investigating and will provide a transparent update shortly. Accountability "
            "is a core value we uphold."
        ),
        (
            "We hear you. Please reach out to our Student Affairs office directly so we "
            "can address this promptly and personally: studentaffairs@university.edu."
        ),
    ],
    "positive": [
        (
            "Thank you for the kind words! We are incredibly proud of our university "
            "community and the work being done every day."
        ),
        (
            "This means so much to us — thank you for sharing! It is the dedication of "
            "our students, faculty, and staff that drives our success."
        ),
        (
            "We are grateful for your support! Achievements like this reflect the "
            "excellence our entire community strives for."
        ),
    ],
    "neutral": [
        (
            "Thank you for sharing your thoughts. We are always looking for ways to "
            "improve and appreciate you taking the time to reach out."
        ),
        (
            "We appreciate the feedback. For the most up-to-date information please visit "
            "our official channels or contact university.edu/contact."
        ),
    ],
}


def suggest_response(mention_content: str, sentiment_label: str = "neutral") -> dict:
    """
    Draft a suggested public response for a mention.

    Returns
    -------
    dict with keys:
        content       str    the draft response text
        generated_by  str    "mock-ai"
        tone          str    "professional"
        word_count    int
    """
    templates = _RESPONSE_TEMPLATES.get(sentiment_label, _RESPONSE_TEMPLATES["neutral"])
    content = random.choice(templates)
    return {
        "content": content,
        "generated_by": "mock-ai",
        "tone": "professional",
        "word_count": len(content.split()),
    }


# ── Summary generation ────────────────────────────────────────────────────────

def generate_summary(
    summary_type: str,
    period_start: datetime,
    period_end: datetime,
    total_mentions: int,
    avg_risk_score: float,
    avg_sentiment_score: float,
    positive_count: int,
    neutral_count: int,
    negative_count: int,
    top_topics: list[str],
) -> dict:
    """
    Generate a narrative digest for a reporting period.

    Returns
    -------
    dict with keys:
        narrative     str    the full narrative paragraph(s)
        generated_by  str    "mock-ai"
    """
    period_label = (
        f"{period_start.strftime('%b %d')} – {period_end.strftime('%b %d, %Y')}"
    )
    sentiment_trend = (
        "predominantly negative" if avg_sentiment_score < -0.2
        else "predominantly positive" if avg_sentiment_score > 0.2
        else "mixed"
    )
    risk_label = (
        "critical" if avg_risk_score >= 8.0
        else "elevated" if avg_risk_score >= 5.5
        else "moderate" if avg_risk_score >= 3.0
        else "low"
    )
    topic_str = ", ".join(top_topics) if top_topics else "general campus activity"
    type_label = summary_type.capitalize()

    narrative = (
        f"{type_label} Report — {period_label}\n\n"
        f"CampusSphere detected {total_mentions} mention(s) across monitored platforms "
        f"during this period. Overall sentiment was {sentiment_trend} "
        f"(avg score: {avg_sentiment_score:+.2f}), comprising {positive_count} positive, "
        f"{neutral_count} neutral, and {negative_count} negative mentions.\n\n"
        f"The average risk score was {avg_risk_score:.1f} / 10.0, indicating {risk_label} "
        f"institutional exposure. Primary topics identified: {topic_str}.\n\n"
    )

    if avg_risk_score >= 8.0:
        narrative += (
            "⚠️  CRITICAL: Recommend immediate escalation to Communications, Legal Affairs, "
            "and the Office of the President for coordinated response."
        )
    elif avg_risk_score >= 5.5:
        narrative += (
            "Recommend escalating high-risk mentions to Communications and relevant "
            "department heads for review within 24 hours."
        )
    else:
        narrative += (
            "No immediate escalation required. Continue routine monitoring cadence."
        )

    return {
        "narrative": narrative,
        "generated_by": "mock-ai",
    }


# ── Executive insight for dashboard hero banner ───────────────────────────────

def generate_insight(
    total_mentions: int,
    avg_risk: float,
    positive_count: int,
    negative_count: int,
    neutral_count: int,
    top_topics: list[str],
) -> dict:
    """
    Generate a concise executive insight sentence for the dashboard hero banner.
    Mirrors the style of the CampusSphere mockup executive summary.

    Returns
    -------
    dict with keys:
        text          str    the headline insight sentence
        subtitle      str    supporting context line
        generated_at  str    ISO timestamp
        generated_by  str    "mock-ai"
    """
    total = total_mentions or 1
    pos_pct = round(positive_count / total * 100)

    risk_label = (
        "critical risk exposure"   if avg_risk >= 8.0  else
        "elevated risk exposure"   if avg_risk >= 5.5  else
        "moderate risk exposure"   if avg_risk >= 3.0  else
        "a low-risk environment"
    )

    # Topics associated with negative content
    risk_topics = [t for t in top_topics if t in [
        "campus safety", "finance", "diversity", "housing",
        "mental health", "athletics", "admissions",
    ]]
    # Topics associated with positive narrative
    positive_topics = [t for t in top_topics if t in ["academics", "administration"]]

    if avg_risk >= 5.5 and negative_count > 0:
        topic_str = (
            " and ".join(t.title() for t in risk_topics[:2])
            if risk_topics else "Reputational"
        )
        text = (
            f"{topic_str} concerns are driving {risk_label} — "
            f"{negative_count} negative mention{'s' if negative_count != 1 else ''} "
            f"require active communications response."
        )
        if pos_pct >= 35:
            text += f" Counter-balanced by {pos_pct}% positive engagement this period."
    elif avg_risk < 3.0:
        text = (
            f"{total_mentions} mentions monitored across active sources with no critical "
            f"escalations. Sentiment is {pos_pct}% positive — institutional reputation is stable."
        )
    else:
        text = (
            f"Monitoring {total_mentions} mention{'s' if total_mentions != 1 else ''} with "
            f"{risk_label}. {negative_count} negative post{'s' if negative_count != 1 else ''} "
            f"warrant review while {positive_count} positive mentions reflect community goodwill."
        )

    subtitle = (
        f"Avg risk {avg_risk:.1f}/10 · Primary topics: {', '.join(top_topics[:4])}"
        if top_topics
        else f"Avg risk {avg_risk:.1f}/10 · {pos_pct}% positive sentiment"
    )

    return {
        "text": text,
        "subtitle": subtitle,
        "generated_at": datetime.utcnow().isoformat(),
        "generated_by": "mock-ai",
    }
