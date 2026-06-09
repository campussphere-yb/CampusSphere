"""
app/seed.py — Auto-seed BU demo data on first startup (empty database only).

Called from main.py at startup. Safe to call repeatedly — checks for existing
data before inserting anything, so it never duplicates rows.

Sources covered:
  Social   — Twitter/X, Reddit r/BostonU, Instagram, LinkedIn, TikTok
  BU-owned — BU Today, The Daily Free Press, WBUR NPR Boston
  External — Boston Globe, Boston Herald, GBH Boston
"""

from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from app.models.source           import Source
from app.models.department       import Department
from app.models.connector        import Connector, CredentialStore, ConnectorStatus
from app.models.mention          import Mention, SentimentLabel, RiskLevel, MentionStatus
from app.models.alert            import Alert, AlertType, AlertSeverity, AlertStatus
from app.models.tracking_keyword import TrackingKeyword


def _ago(days: int = 0, hours: int = 0, minutes: int = 0) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days, hours=hours, minutes=minutes)


def seed_if_empty(db: Session) -> None:
    """Insert BU demo data only when the database has no mentions yet."""
    if db.query(Mention).first():
        return  # already seeded — do nothing

    # ── Sources ────────────────────────────────────────────────────────────────
    # Social platforms
    tw = Source(name="Twitter / X",          platform_key="twitter",   base_url="https://twitter.com",              is_active=True)
    rd = Source(name="Reddit — r/BostonU",   platform_key="reddit",    base_url="https://reddit.com/r/BostonU",     is_active=True)
    ig = Source(name="Instagram",            platform_key="instagram", base_url="https://instagram.com",            is_active=True)
    li = Source(name="LinkedIn",             platform_key="linkedin",  base_url="https://linkedin.com",             is_active=True)
    tt = Source(name="TikTok",               platform_key="tiktok",    base_url="https://tiktok.com",               is_active=True)
    # BU-owned / affiliated publications
    but  = Source(name="BU Today",           platform_key="news",      base_url="https://bu.edu/today",             is_active=True)
    dfp  = Source(name="Daily Free Press",   platform_key="news",      base_url="https://dailyfreepress.com",       is_active=True)
    wbur = Source(name="WBUR NPR Boston",    platform_key="news",      base_url="https://wbur.org",                 is_active=True)
    # External Boston media
    glob = Source(name="Boston Globe",       platform_key="news",      base_url="https://bostonglobe.com",          is_active=True)
    her  = Source(name="Boston Herald",      platform_key="news",      base_url="https://bostonherald.com",         is_active=True)
    ghb  = Source(name="GBH Boston",         platform_key="news",      base_url="https://wgbh.org",                 is_active=True)

    db.add_all([tw, rd, ig, li, tt, but, dfp, wbur, glob, her, ghb])
    db.flush()

    # ── Departments ────────────────────────────────────────────────────────────
    comms    = Department(name="Office of Communications",        description="University-wide communications and public relations",       contact_email="comms@bu.edu")
    student  = Department(name="Student Affairs",                 description="Dean of Students and campus life oversight",               contact_email="studentaffairs@bu.edu")
    athlet   = Department(name="Athletics",                       description="BU Terriers varsity sports programs",                      contact_email="athletics@bu.edu")
    pres     = Department(name="Office of the President",         description="Executive leadership communications",                     contact_email="president@bu.edu")
    fin      = Department(name="Financial Affairs",               description="Tuition, fees, and financial planning",                   contact_email="finance@bu.edu")
    housing  = Department(name="Housing & Residence Life",        description="On-campus housing including Warren Towers and more",      contact_email="housing@bu.edu")
    research = Department(name="Research & Innovation",           description="Sponsored research, grants, and commercialization",       contact_email="research@bu.edu")
    legal    = Department(name="Office of General Counsel",       description="Legal affairs and compliance",                           contact_email="legal@bu.edu")
    dei      = Department(name="Diversity & Inclusion",           description="Equity, diversity, and Title IX compliance",              contact_email="dei@bu.edu")

    db.add_all([comms, student, athlet, pres, fin, housing, research, legal, dei])
    db.flush()

    # ── Connectors (one per source) ────────────────────────────────────────────
    ctw  = Connector(name="Twitter/X — BU Monitor",     source_id=tw.id,   credential_store=CredentialStore.mock, credential_ref="TWITTER_BU_BEARER",  status=ConnectorStatus.active)
    crd  = Connector(name="Reddit — r/BostonU Feed",    source_id=rd.id,   credential_store=CredentialStore.mock, credential_ref="REDDIT_BU_TOKEN",    status=ConnectorStatus.active)
    cig  = Connector(name="Instagram — BU Mentions",    source_id=ig.id,   credential_store=CredentialStore.mock, credential_ref="INSTA_BU_TOKEN",     status=ConnectorStatus.active)
    cli  = Connector(name="LinkedIn — BU Pages",        source_id=li.id,   credential_store=CredentialStore.mock, credential_ref="LINKEDIN_BU_TOKEN",  status=ConnectorStatus.active)
    ctt  = Connector(name="TikTok — BU Mentions",       source_id=tt.id,   credential_store=CredentialStore.mock, credential_ref="TIKTOK_BU_TOKEN",    status=ConnectorStatus.active)
    cbut = Connector(name="BU Today Scraper",           source_id=but.id,  credential_store=CredentialStore.mock, credential_ref="BU_TODAY_KEY",       status=ConnectorStatus.active)
    cdfp = Connector(name="Daily Free Press Scraper",   source_id=dfp.id,  credential_store=CredentialStore.mock, credential_ref="DFP_API_KEY",        status=ConnectorStatus.active)
    cwbur= Connector(name="WBUR NPR Feed",              source_id=wbur.id, credential_store=CredentialStore.mock, credential_ref="WBUR_RSS_KEY",       status=ConnectorStatus.active)
    cglob= Connector(name="Boston Globe — BU Coverage", source_id=glob.id, credential_store=CredentialStore.mock, credential_ref="GLOBE_API_KEY",      status=ConnectorStatus.active)
    cher = Connector(name="Boston Herald — BU Feed",    source_id=her.id,  credential_store=CredentialStore.mock, credential_ref="HERALD_API_KEY",     status=ConnectorStatus.active)
    cghb = Connector(name="GBH Boston Feed",            source_id=ghb.id,  credential_store=CredentialStore.mock, credential_ref="GBH_RSS_KEY",        status=ConnectorStatus.active)

    db.add_all([ctw, crd, cig, cli, ctt, cbut, cdfp, cwbur, cglob, cher, cghb])
    db.flush()

    # ── Tracking Keywords ──────────────────────────────────────────────────────
    for kw in [
        "boston university", "bu terriers", "bu tuition", "warren towers",
        "title ix bu", "bu housing lottery", "bu research grant", "daily free press",
        "bu commencement", "questrom school", "bu campus safety", "agganis arena",
        "wbur bu", "bu financial aid", "bu athletics", "chobanian school of medicine",
        "bu law school", "bu wheelock", "bu engineering", "nickerson field",
    ]:
        db.add(TrackingKeyword(keyword=kw, is_active=True))

    # ── Mentions — all status=new (user has not triaged any yet) ──────────────
    mentions = [

        # ── Daily Free Press ──────────────────────────────────────────────────
        Mention(
            connector_id=cdfp.id, source_id=dfp.id,
            content="Boston University announced a 4.2% tuition increase for the 2026-27 academic year, bringing annual undergraduate costs to over $62,000. Student advocacy groups are demanding a freeze and greater financial aid transparency ahead of the Board of Trustees meeting next month.",
            author_handle="@DailyFreePress", url="https://dailyfreepress.com/2026/06/bu-tuition-hike",
            published_at=_ago(hours=3),
            sentiment_score=-0.72, sentiment_label=SentimentLabel.negative,
            risk_score=8.2, risk_level=RiskLevel.critical,
            topics='["tuition","financial aid","student protest"]',
            department_id=fin.id, status=MentionStatus.new,
        ),
        Mention(
            connector_id=cdfp.id, source_id=dfp.id,
            content="Students at BU's College of Arts & Sciences are calling for increased mental health counseling resources after SARP waitlists reached a record 6-week delay. The Free Press survey found 68% of undergrads reported unmet mental health needs this semester.",
            author_handle="@DailyFreePress", url="https://dailyfreepress.com/2026/06/mental-health-sarp",
            published_at=_ago(hours=28),
            sentiment_score=-0.58, sentiment_label=SentimentLabel.negative,
            risk_score=6.1, risk_level=RiskLevel.high,
            topics='["mental health","counseling","student wellbeing"]',
            department_id=student.id, status=MentionStatus.new,
        ),

        # ── Boston Globe ──────────────────────────────────────────────────────
        Mention(
            connector_id=cglob.id, source_id=glob.id,
            content="A Title IX complaint filed against Boston University alleges the university failed to respond adequately to reported sexual misconduct in two campus programs. The Department of Education's Office for Civil Rights has formally opened an investigation, BU confirmed Monday.",
            author_handle="@BostonGlobe", url="https://bostonglobe.com/2026/06/bu-title-ix-investigation",
            published_at=_ago(hours=6),
            sentiment_score=-0.89, sentiment_label=SentimentLabel.negative,
            risk_score=9.3, risk_level=RiskLevel.critical,
            topics='["title ix","federal investigation","compliance"]',
            department_id=legal.id, status=MentionStatus.new,
        ),
        Mention(
            connector_id=cglob.id, source_id=glob.id,
            content="Boston University's enrollment has hit a record 36,000 students this fall, driven by a surge in graduate and international applicants. President Brown called it 'a testament to BU's global reputation,' though some faculty warn infrastructure is not keeping pace.",
            author_handle="@BostonGlobe", url="https://bostonglobe.com/2026/06/bu-enrollment-record",
            published_at=_ago(days=2, hours=4),
            sentiment_score=0.41, sentiment_label=SentimentLabel.positive,
            risk_score=3.1, risk_level=RiskLevel.medium,
            topics='["enrollment","growth","infrastructure"]',
            department_id=pres.id, status=MentionStatus.new,
        ),

        # ── WBUR NPR Boston ───────────────────────────────────────────────────
        Mention(
            connector_id=cwbur.id, source_id=wbur.id,
            content="Boston University's Chobanian & Avedisian School of Medicine has launched a landmark $50M initiative to expand community health access in Roxbury and Mattapan. WBUR reports the program will place 200 resident physicians in underserved Boston neighborhoods over five years.",
            author_handle="@WBUR", url="https://wbur.org/news/2026/06/bu-medicine-community-health",
            published_at=_ago(days=1, hours=2),
            sentiment_score=0.86, sentiment_label=SentimentLabel.positive,
            risk_score=0.3, risk_level=RiskLevel.low,
            topics='["medicine","community health","research","chobanian school"]',
            department_id=research.id, status=MentionStatus.new,
        ),
        Mention(
            connector_id=cwbur.id, source_id=wbur.id,
            content="BU faculty union leaders tell WBUR that contract negotiations have stalled over salary equity and course load disputes. A vote on strike authorization is expected this week if administration does not return to the table with a revised offer.",
            author_handle="@WBUR", url="https://wbur.org/news/2026/06/bu-faculty-union-strike",
            published_at=_ago(hours=11),
            sentiment_score=-0.74, sentiment_label=SentimentLabel.negative,
            risk_score=7.8, risk_level=RiskLevel.high,
            topics='["faculty union","labor","strike"]',
            department_id=pres.id, status=MentionStatus.new,
        ),

        # ── Boston Herald ─────────────────────────────────────────────────────
        Mention(
            connector_id=cher.id, source_id=her.id,
            content="Boston University police responded to three off-campus incidents near Commonwealth Ave over the weekend. BU has not issued a formal safety advisory, drawing criticism from the Student Government Association, which called for an emergency briefing.",
            author_handle="@BostonHerald", url="https://bostonherald.com/2026/06/bu-campus-safety",
            published_at=_ago(hours=18),
            sentiment_score=-0.61, sentiment_label=SentimentLabel.negative,
            risk_score=7.2, risk_level=RiskLevel.high,
            topics='["campus safety","BUPD","student government"]',
            department_id=student.id, status=MentionStatus.new,
        ),

        # ── GBH Boston ────────────────────────────────────────────────────────
        Mention(
            connector_id=cghb.id, source_id=ghb.id,
            content="Boston University's Photonics Center has received a $14.2M NIH grant to advance biophotonic cancer diagnostics. GBH reports the technology, led by Prof. Anna Walsh, could enable non-invasive tumor detection years earlier than current methods.",
            author_handle="@GBHNews", url="https://wgbh.org/news/2026/06/bu-photonics-nih-grant",
            published_at=_ago(days=3, hours=9),
            sentiment_score=0.88, sentiment_label=SentimentLabel.positive,
            risk_score=0.4, risk_level=RiskLevel.low,
            topics='["research","NIH grant","photonics","cancer"]',
            department_id=research.id, status=MentionStatus.new,
        ),

        # ── BU Today ──────────────────────────────────────────────────────────
        Mention(
            connector_id=cbut.id, source_id=but.id,
            content="Questrom School of Business has been ranked #12 nationally for undergraduate business programs by US News & World Report, its highest ranking ever. Dean Susan McCabe credited interdisciplinary curriculum reforms introduced in 2024.",
            author_handle="@BUToday", url="https://bu.edu/today/2026/questrom-ranking",
            published_at=_ago(days=5, hours=7),
            sentiment_score=0.93, sentiment_label=SentimentLabel.positive,
            risk_score=0.2, risk_level=RiskLevel.low,
            topics='["questrom","rankings","business school"]',
            department_id=comms.id, status=MentionStatus.new,
        ),
        Mention(
            connector_id=cbut.id, source_id=but.id,
            content="BU Athletics announces a $28M renovation of Nickerson Field, the largest investment in campus recreation infrastructure in the university's history. The project will add a 3,000-seat covered grandstand and all-weather turf for lacrosse, soccer, and football.",
            author_handle="@BUToday", url="https://bu.edu/today/2026/nickerson-field-renovation",
            published_at=_ago(days=4, hours=1),
            sentiment_score=0.78, sentiment_label=SentimentLabel.positive,
            risk_score=0.5, risk_level=RiskLevel.low,
            topics='["athletics","facilities","renovation","nickerson field"]',
            department_id=athlet.id, status=MentionStatus.new,
        ),

        # ── Twitter / X ───────────────────────────────────────────────────────
        Mention(
            connector_id=ctw.id, source_id=tw.id,
            content="BU Terriers WIN the 2026 Beanpot! 3-1 over BC, fourth consecutive title. Agganis Arena goes absolutely electric. This team is legendary. #BUTerriers #Beanpot #HockeyEast",
            author_handle="@BUHockey", url="https://twitter.com/BUHockey/status/1234567890",
            published_at=_ago(days=6, hours=2),
            sentiment_score=0.95, sentiment_label=SentimentLabel.positive,
            risk_score=0.3, risk_level=RiskLevel.low,
            topics='["athletics","hockey","beanpot","agganis arena"]',
            department_id=athlet.id, status=MentionStatus.new,
        ),
        Mention(
            connector_id=ctw.id, source_id=tw.id,
            content="BU housing lottery results just dropped and half my friend group got shut out of on-campus housing AGAIN. University keeps expanding enrollment but dorm capacity hasn't grown in 10 years. This is a crisis. @BU_Housing @BUPresident",
            author_handle="@terrier_class26", url="https://twitter.com/terrier_class26/status/9876543210",
            published_at=_ago(days=1, hours=14),
            sentiment_score=-0.55, sentiment_label=SentimentLabel.negative,
            risk_score=5.8, risk_level=RiskLevel.high,
            topics='["housing lottery","enrollment","capacity"]',
            department_id=housing.id, status=MentionStatus.new,
        ),
        Mention(
            connector_id=ctw.id, source_id=tw.id,
            content="Incredibly concerned about the faculty union situation at @BostonU. If a strike happens mid-semester students are the ones who suffer. Admin needs to get serious at the table. #BUStrong",
            author_handle="@bu_grad_student_22", url="https://twitter.com/bu_grad_student_22/status/111222333",
            published_at=_ago(hours=8),
            sentiment_score=-0.66, sentiment_label=SentimentLabel.negative,
            risk_score=6.9, risk_level=RiskLevel.high,
            topics='["faculty union","strike","student impact"]',
            department_id=pres.id, status=MentionStatus.new,
        ),

        # ── Reddit r/BostonU ──────────────────────────────────────────────────
        Mention(
            connector_id=crd.id, source_id=rd.id,
            content="Warren Towers has had no hot water for THREE DAYS. Facilities keeps saying 'we're working on it.' I pay $16,000 a year to live here and can't shower. This is completely unacceptable. Has anyone else filed a formal complaint?",
            author_handle="u/BU_Frustrated_Freshman", url="https://reddit.com/r/BostonU/comments/warrenhot",
            published_at=_ago(days=1, hours=5),
            sentiment_score=-0.63, sentiment_label=SentimentLabel.negative,
            risk_score=6.4, risk_level=RiskLevel.high,
            topics='["warren towers","housing","facilities"]',
            department_id=housing.id, status=MentionStatus.new,
        ),
        Mention(
            connector_id=crd.id, source_id=rd.id,
            content="Anyone else think BU dining has gone downhill since they switched vendors? Shorter hours, smaller portions, same price. GSU dining closed on weekends now too. For what we pay in meal plan fees this is embarrassing.",
            author_handle="u/HungryTerrier", url="https://reddit.com/r/BostonU/comments/dining2026",
            published_at=_ago(days=2, hours=8),
            sentiment_score=-0.47, sentiment_label=SentimentLabel.negative,
            risk_score=3.8, risk_level=RiskLevel.medium,
            topics='["dining","student services","meal plan"]',
            department_id=student.id, status=MentionStatus.new,
        ),

        # ── Instagram ─────────────────────────────────────────────────────────
        Mention(
            connector_id=cig.id, source_id=ig.id,
            content="Class of 2026 Commencement on Nickerson Field was absolutely magical ✨ Four years of hard work, late nights at Mugar Library, and incredible friendships. Proudest day of my life. Thank you Boston University! #BU2026 #Commencement #GoTerriers",
            author_handle="@sarahmcallister_bu", url="https://instagram.com/p/commencement2026",
            published_at=_ago(days=8),
            sentiment_score=0.97, sentiment_label=SentimentLabel.positive,
            risk_score=0.2, risk_level=RiskLevel.low,
            topics='["commencement","graduation","positive campus"]',
            department_id=student.id, status=MentionStatus.new,
        ),
        Mention(
            connector_id=cig.id, source_id=ig.id,
            content="The new Wheelock College of Education mural on Bay State Road is absolutely stunning 🎨 BU's investment in public art is making the whole campus feel more vibrant. So proud of this community. #BostonUniversity #Wheelock",
            author_handle="@bu_arts_collective", url="https://instagram.com/p/wheelockmural26",
            published_at=_ago(days=3, hours=5),
            sentiment_score=0.82, sentiment_label=SentimentLabel.positive,
            risk_score=0.1, risk_level=RiskLevel.low,
            topics='["wheelock","public art","campus life"]',
            department_id=comms.id, status=MentionStatus.new,
        ),

        # ── LinkedIn ──────────────────────────────────────────────────────────
        Mention(
            connector_id=cli.id, source_id=li.id,
            content="Proud to announce I've accepted an offer at McKinsey & Company following my MBA from Boston University Questrom School of Business. The experiential learning program and faculty mentorship at BU were game-changing. Grateful to the entire Questrom community. #BU #Questrom #MBA",
            author_handle="David Chen, MBA '26", url="https://linkedin.com/posts/davidchen-mba26",
            published_at=_ago(days=4, hours=3),
            sentiment_score=0.94, sentiment_label=SentimentLabel.positive,
            risk_score=0.1, risk_level=RiskLevel.low,
            topics='["questrom","alumni success","MBA","career"]',
            department_id=comms.id, status=MentionStatus.new,
        ),
        Mention(
            connector_id=cli.id, source_id=li.id,
            content="Boston University's new industry partnership with Raytheon Technologies will embed 40 BU engineering students annually in defense R&D projects. As a BU Engineering alumnus, this is exactly the kind of applied learning pipeline we needed. Great move by leadership.",
            author_handle="Jennifer Walsh, BU ENG '14", url="https://linkedin.com/posts/jwalsh-bu-eng",
            published_at=_ago(days=6, hours=10),
            sentiment_score=0.79, sentiment_label=SentimentLabel.positive,
            risk_score=1.2, risk_level=RiskLevel.low,
            topics='["engineering","industry partnership","Raytheon","alumni"]',
            department_id=research.id, status=MentionStatus.new,
        ),

        # ── TikTok ────────────────────────────────────────────────────────────
        Mention(
            connector_id=ctt.id, source_id=tt.id,
            content="POV: you're a BU freshman who just got a $62,000 tuition bill 💀 and the financial aid office has a 3-week callback wait. This video has 2.1M views. Boston University needs to address this NOW. #CollegeDebt #BostonUniversity #TuitionCrisis",
            author_handle="@bu_reality_check", url="https://tiktok.com/@bu_reality_check/video/987654321",
            published_at=_ago(hours=16),
            sentiment_score=-0.81, sentiment_label=SentimentLabel.negative,
            risk_score=7.5, risk_level=RiskLevel.high,
            topics='["tuition","financial aid","viral","student debt"]',
            department_id=fin.id, status=MentionStatus.new,
        ),
        Mention(
            connector_id=ctt.id, source_id=tt.id,
            content="Day in my life as a BU pre-med at Chobanian School of Medicine 🩺 6am anatomy lab, afternoon clinical rotations at BMC, studying at the BU Med campus library until midnight. It's brutal but I wouldn't trade it. #BUMed #PreMed #BostonUniversity",
            author_handle="@premed_terrier", url="https://tiktok.com/@premed_terrier/video/123456789",
            published_at=_ago(days=2, hours=6),
            sentiment_score=0.71, sentiment_label=SentimentLabel.positive,
            risk_score=0.2, risk_level=RiskLevel.low,
            topics='["chobanian school","pre-med","student life","medicine"]',
            department_id=student.id, status=MentionStatus.new,
        ),
    ]

    db.add_all(mentions)
    db.flush()

    # ── Alerts ────────────────────────────────────────────────────────────────
    # Link alerts to the highest-risk mentions by index
    m_title_ix  = mentions[2]   # Boston Globe Title IX
    m_tuition   = mentions[0]   # Daily Free Press tuition
    m_union     = mentions[5]   # WBUR faculty union
    m_tiktok    = mentions[18]  # TikTok tuition viral
    m_warren    = mentions[12]  # Reddit Warren Towers
    m_safety    = mentions[6]   # Boston Herald campus safety

    db.add_all([
        Alert(
            title="Title IX Federal Investigation — Immediate Response Required",
            description="OCR has formally opened a Title IX investigation per Boston Globe reporting. Legal Affairs and the President's Office must coordinate a public response within 48 hours. Risk score: 9.3.",
            alert_type=AlertType.risk_spike, severity=AlertSeverity.critical,
            mention_id=m_title_ix.id, status=AlertStatus.open,
        ),
        Alert(
            title="Tuition Hike Coverage Going Viral — Negative Sentiment Surge",
            description="Daily Free Press article on 4.2% tuition increase gaining rapid social traction. TikTok video has 2.1M views. Financial Affairs should issue a proactive statement before this cycle. Risk score: 8.2.",
            alert_type=AlertType.sentiment_drop, severity=AlertSeverity.critical,
            mention_id=m_tuition.id, status=AlertStatus.open,
        ),
        Alert(
            title="Faculty Union Strike Vote Expected This Week — WBUR",
            description="WBUR reporting strike authorization vote imminent. A mid-semester faculty strike would be a major reputational and operational crisis. Provost's Office and HR must re-engage immediately.",
            alert_type=AlertType.risk_spike, severity=AlertSeverity.critical,
            mention_id=m_union.id, status=AlertStatus.open,
        ),
        Alert(
            title="Campus Safety Incidents — No Advisory Issued Yet",
            description="Boston Herald reports 3 off-campus incidents near Comm Ave with no BU safety advisory issued. Student Government is calling for an emergency briefing. Communications should act today.",
            alert_type=AlertType.risk_spike, severity=AlertSeverity.warning,
            mention_id=m_safety.id, status=AlertStatus.open,
        ),
        Alert(
            title="Warren Towers Hot Water Outage — Reddit Thread Growing",
            description="Reddit post on 3-day hot water outage in Warren Towers accumulating upvotes. Housing & Residence Life should post a public timeline update within the hour.",
            alert_type=AlertType.volume_surge, severity=AlertSeverity.warning,
            mention_id=m_warren.id, status=AlertStatus.open,
        ),
    ])

    db.commit()
    print(f"[seed] Seeded {len(mentions)} mentions across 11 BU sources — all status=new.")
