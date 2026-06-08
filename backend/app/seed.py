"""
app/seed.py — Auto-seed BU demo data on first startup (empty database only).

Called from main.py at startup. Safe to call repeatedly — checks for existing
data before inserting anything, so it never duplicates rows.
"""

from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from app.models.source           import Source
from app.models.department       import Department
from app.models.connector        import Connector, CredentialStore, ConnectorStatus
from app.models.mention          import Mention, SentimentLabel, RiskLevel, MentionStatus
from app.models.alert            import Alert, AlertType, AlertSeverity, AlertStatus
from app.models.tracking_keyword import TrackingKeyword


def _ago(days: int = 0, hours: int = 0) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days, hours=hours)


def seed_if_empty(db: Session) -> None:
    """Insert BU demo data only when the database has no mentions yet."""
    if db.query(Mention).first():
        return   # already seeded — do nothing

    # ── Sources ────────────────────────────────────────────────────────────────
    tw   = Source(name="Twitter / X",        platform_key="twitter",   base_url="https://twitter.com",          is_active=True)
    rd   = Source(name="Reddit — r/BostonU", platform_key="reddit",    base_url="https://reddit.com/r/BostonU", is_active=True)
    ig   = Source(name="Instagram",          platform_key="instagram", base_url="https://instagram.com",        is_active=True)
    news = Source(name="BU Today / News",    platform_key="news",      base_url="https://bu.edu/today",         is_active=True)
    db.add_all([tw, rd, ig, news])
    db.flush()   # assigns .id without committing

    # ── Departments ────────────────────────────────────────────────────────────
    comms   = Department(name="Office of Communications",  description="University-wide communications and PR",                contact_email="comms@bu.edu")
    student = Department(name="Student Affairs",           description="Dean of Students and campus life oversight",           contact_email="studentaffairs@bu.edu")
    athlet  = Department(name="Athletics",                 description="BU Terriers varsity sports programs",                  contact_email="athletics@bu.edu")
    pres    = Department(name="Office of the President",   description="Executive leadership communications",                  contact_email="president@bu.edu")
    fin     = Department(name="Financial Affairs",         description="Tuition, fees, and financial planning",               contact_email="finance@bu.edu")
    housing = Department(name="Housing & Residence Life",  description="On-campus housing including Warren Towers and more",  contact_email="housing@bu.edu")
    research= Department(name="Research & Innovation",     description="Sponsored research, grants, and commercialization",   contact_email="research@bu.edu")
    db.add_all([comms, student, athlet, pres, fin, housing, research])
    db.flush()

    # ── Connectors ────────────────────────────────────────────────────────────
    ctw   = Connector(name="Twitter/X — BU Monitor",   source_id=tw.id,   credential_store=CredentialStore.mock, credential_ref="TWITTER_BU_BEARER",  status=ConnectorStatus.active)
    crd   = Connector(name="Reddit — r/BostonU",        source_id=rd.id,   credential_store=CredentialStore.mock, credential_ref="REDDIT_BU_TOKEN",    status=ConnectorStatus.active)
    cig   = Connector(name="Instagram — BU Official",   source_id=ig.id,   credential_store=CredentialStore.mock, credential_ref="INSTA_BU_TOKEN",     status=ConnectorStatus.active)
    cnews = Connector(name="BU Today / News Scraper",   source_id=news.id, credential_store=CredentialStore.mock, credential_ref="BU_NEWS_API_KEY",    status=ConnectorStatus.active)
    db.add_all([ctw, crd, cig, cnews])
    db.flush()

    # ── Tracking Keywords ──────────────────────────────────────────────────────
    for kw in [
        "boston university", "bu terriers", "bu tuition", "warren towers",
        "title ix bu", "bu housing lottery", "bu research grant", "daily free press",
        "bu commencement", "questrom school", "bu campus safety", "agganis arena",
    ]:
        db.add(TrackingKeyword(keyword=kw, is_active=True))

    # ── Mentions ──────────────────────────────────────────────────────────────
    m1 = Mention(
        connector_id=cnews.id, source_id=news.id,
        content="Boston University announced a 4.2% tuition increase for the 2026-27 academic year, bringing annual undergraduate costs to over $62,000. Student groups are calling for greater financial aid transparency.",
        author_handle="@dailyfreepress", url="https://dailyfreepress.com/bu-tuition-hike-2026",
        published_at=_ago(days=2, hours=3),
        sentiment_score=-0.72, sentiment_label=SentimentLabel.negative,
        risk_score=8.2, risk_level=RiskLevel.critical,
        topics='["tuition","financial aid","student protest"]',
        department_id=fin.id, status=MentionStatus.new,
    )
    m2 = Mention(
        connector_id=ctw.id, source_id=tw.id,
        content="BU Terriers WIN the 2026 Beanpot! 3-1 over BC, fourth consecutive title. Agganis Arena erupts. #BUTerriers #Beanpot",
        author_handle="@BUHockey", url="https://twitter.com/BUHockey/status/123456",
        published_at=_ago(days=5, hours=1),
        sentiment_score=0.95, sentiment_label=SentimentLabel.positive,
        risk_score=0.3, risk_level=RiskLevel.low,
        topics='["athletics","hockey","beanpot"]',
        department_id=athlet.id, status=MentionStatus.reviewed,
    )
    m3 = Mention(
        connector_id=crd.id, source_id=rd.id,
        content="Warren Towers has had no hot water for THREE DAYS and facilities keeps saying 'we're working on it.' This is unacceptable for what we pay in housing fees.",
        author_handle="u/BU_Frustrated_Freshman", url="https://reddit.com/r/BostonU/comments/abc123",
        published_at=_ago(days=1, hours=6),
        sentiment_score=-0.63, sentiment_label=SentimentLabel.negative,
        risk_score=6.4, risk_level=RiskLevel.high,
        topics='["warren towers","housing","facilities"]',
        department_id=housing.id, status=MentionStatus.new,
    )
    m4 = Mention(
        connector_id=cig.id, source_id=ig.id,
        content="Class of 2026 Commencement on Nickerson Field was absolutely magical ✨ Proudest day of my life. Thank you Boston University! #BU2026 #Commencement",
        author_handle="@sarahmcallister_bu", url="https://instagram.com/p/xyz789",
        published_at=_ago(days=10),
        sentiment_score=0.97, sentiment_label=SentimentLabel.positive,
        risk_score=0.2, risk_level=RiskLevel.low,
        topics='["commencement","graduation","positive campus"]',
        department_id=student.id, status=MentionStatus.reviewed,
    )
    m5 = Mention(
        connector_id=cnews.id, source_id=news.id,
        content="A Title IX complaint filed against Boston University alleges inadequate institutional response to reported incidents in two campus programs. The Office for Civil Rights has opened an investigation.",
        author_handle="@BostonGlobe", url="https://bostonglobe.com/bu-title-ix-investigation",
        published_at=_ago(hours=14),
        sentiment_score=-0.89, sentiment_label=SentimentLabel.negative,
        risk_score=9.3, risk_level=RiskLevel.critical,
        topics='["title ix","legal","federal investigation"]',
        department_id=pres.id, status=MentionStatus.escalated,
    )
    m6 = Mention(
        connector_id=cnews.id, source_id=news.id,
        content="Boston University's Photonics Center receives $14.2M NIH grant to advance biophotonic cancer diagnostics. Lead researcher Prof. Anna Walsh calls it 'transformational for early detection.'",
        author_handle="@BUToday", url="https://bu.edu/today/photonics-nih-grant",
        published_at=_ago(days=3, hours=9),
        sentiment_score=0.88, sentiment_label=SentimentLabel.positive,
        risk_score=0.4, risk_level=RiskLevel.low,
        topics='["research","grant","photonics","NIH"]',
        department_id=research.id, status=MentionStatus.reviewed,
    )
    m7 = Mention(
        connector_id=ctw.id, source_id=tw.id,
        content="BU housing lottery results dropped and half my friend group got shut out of on-campus housing again. The university is expanding enrollment but not dorm capacity. What gives? @BU_Housing",
        author_handle="@terrier_class26", url="https://twitter.com/terrier_class26/status/789012",
        published_at=_ago(days=4, hours=2),
        sentiment_score=-0.55, sentiment_label=SentimentLabel.negative,
        risk_score=5.8, risk_level=RiskLevel.high,
        topics='["housing lottery","enrollment","capacity"]',
        department_id=housing.id, status=MentionStatus.new,
    )
    m8 = Mention(
        connector_id=crd.id, source_id=rd.id,
        content="Questrom School of Business just ranked #12 nationally for undergraduate business by US News. BU is moving up across the board. Genuinely proud to be a Terrier.",
        author_handle="u/QuestromProud", url="https://reddit.com/r/BostonU/comments/def456",
        published_at=_ago(days=7, hours=5),
        sentiment_score=0.91, sentiment_label=SentimentLabel.positive,
        risk_score=0.5, risk_level=RiskLevel.low,
        topics='["questrom","rankings","positive campus"]',
        department_id=comms.id, status=MentionStatus.reviewed,
    )
    db.add_all([m1, m2, m3, m4, m5, m6, m7, m8])
    db.flush()

    # ── Alerts ────────────────────────────────────────────────────────────────
    db.add_all([
        Alert(
            title="Title IX Federal Investigation — Immediate Response Required",
            description="OCR has formally opened a Title IX investigation. Legal Affairs and President's Office must coordinate a response within 48 hours.",
            alert_type=AlertType.risk_spike, severity=AlertSeverity.critical,
            mention_id=m5.id, status=AlertStatus.open,
        ),
        Alert(
            title="Tuition Hike Coverage Going Viral — Negative Sentiment Rising",
            description="Daily Free Press article on 4.2% tuition increase gaining traction on social. Risk score 8.2. Financial Affairs should prepare a proactive statement.",
            alert_type=AlertType.sentiment_drop, severity=AlertSeverity.critical,
            mention_id=m1.id, status=AlertStatus.open,
        ),
        Alert(
            title="Warren Towers Facilities Complaint — Reddit Traction",
            description="Hot water outage post gaining upvotes on r/BostonU. Housing & Residence Life should acknowledge and provide a timeline.",
            alert_type=AlertType.volume_surge, severity=AlertSeverity.warning,
            mention_id=m3.id, status=AlertStatus.open,
        ),
        Alert(
            title="Housing Lottery Backlash — Capacity Concerns Trending",
            description="Multiple posts across Twitter and Reddit raising capacity vs enrollment concerns. Pattern suggests coordinated frustration.",
            alert_type=AlertType.volume_surge, severity=AlertSeverity.warning,
            mention_id=m7.id, status=AlertStatus.open,
        ),
    ])

    db.commit()
    print("[seed] BU demo data seeded successfully.")
