"""
seed_bu_data.py — Populates the Railway database with realistic Boston University data.

Run against the live Railway backend:
    python seed_bu_data.py

Or against local dev:
    python seed_bu_data.py http://127.0.0.1:8000
"""

import sys
import json
import urllib.request
import urllib.error
from datetime import datetime, timedelta, timezone

BASE = sys.argv[1] if len(sys.argv) > 1 else "https://campussphere-production.up.railway.app"

def post(path, payload):
    data = json.dumps(payload).encode()
    req  = urllib.request.Request(
        f"{BASE}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  ✗ POST {path} → HTTP {e.code}: {body[:200]}")
        return None

def get(path):
    req = urllib.request.Request(f"{BASE}{path}")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def ago(days=0, hours=0):
    dt = datetime.now(timezone.utc) - timedelta(days=days, hours=hours)
    return dt.isoformat()

# ─────────────────────────────────────────────────────────────
print("\n── Health check ──────────────────────────────────────")
health = get("/health")
print(f"  {health}")

# ─────────────────────────────────────────────────────────────
print("\n── Sources ───────────────────────────────────────────")
sources_data = [
    {"name": "Twitter / X",         "platform_key": "twitter",   "base_url": "https://twitter.com",         "is_active": True},
    {"name": "Reddit — r/BostonU",  "platform_key": "reddit",    "base_url": "https://reddit.com/r/BostonU","is_active": True},
    {"name": "Instagram",           "platform_key": "instagram", "base_url": "https://instagram.com",       "is_active": True},
    {"name": "BU Today / News",     "platform_key": "news",      "base_url": "https://bu.edu/today",        "is_active": True},
]
sources = {}
for s in sources_data:
    res = post("/api/v1/sources/", s)
    if res:
        sources[s["platform_key"]] = res["id"]
        print(f"  ✓ {s['name']} → id={res['id']}")

# ─────────────────────────────────────────────────────────────
print("\n── Departments ───────────────────────────────────────")
depts_data = [
    {"name": "Office of Communications",        "description": "University-wide communications and public relations",      "contact_email": "comms@bu.edu"},
    {"name": "Student Affairs",                 "description": "Dean of Students and campus life oversight",               "contact_email": "studentaffairs@bu.edu"},
    {"name": "Athletics",                       "description": "BU Terriers varsity sports programs",                      "contact_email": "athletics@bu.edu"},
    {"name": "Office of the President",         "description": "Executive leadership communications",                     "contact_email": "president@bu.edu"},
    {"name": "Financial Affairs",               "description": "Tuition, fees, and financial planning",                   "contact_email": "finance@bu.edu"},
    {"name": "Housing & Residence Life",        "description": "On-campus housing including Warren Towers and more",      "contact_email": "housing@bu.edu"},
    {"name": "Research & Innovation",           "description": "Sponsored research, grants, and commercialization",       "contact_email": "research@bu.edu"},
]
depts = {}
for d in depts_data:
    res = post("/api/v1/departments/", d)
    if res:
        depts[d["name"]] = res["id"]
        print(f"  ✓ {d['name']} → id={res['id']}")

# ─────────────────────────────────────────────────────────────
print("\n── Connectors ────────────────────────────────────────")
connectors_data = [
    {"name": "Twitter/X — BU Monitor",    "source_id": sources.get("twitter"),   "credential_store": "mock", "credential_ref": "TWITTER_BU_BEARER"},
    {"name": "Reddit — r/BostonU",        "source_id": sources.get("reddit"),    "credential_store": "mock", "credential_ref": "REDDIT_BU_TOKEN"},
    {"name": "Instagram — BU Official",   "source_id": sources.get("instagram"), "credential_store": "mock", "credential_ref": "INSTA_BU_TOKEN"},
    {"name": "BU Today / News Scraper",   "source_id": sources.get("news"),      "credential_store": "mock", "credential_ref": "BU_NEWS_API_KEY"},
]
connectors = {}
for c in connectors_data:
    if not c["source_id"]:
        print(f"  ⚠ Skipping {c['name']} — no source_id")
        continue
    res = post("/api/v1/connectors/", c)
    if res:
        # map by source_id for easy lookup below
        connectors[c["source_id"]] = res["id"]
        print(f"  ✓ {c['name']} → id={res['id']}")

def conn(platform_key):
    sid = sources.get(platform_key)
    return connectors.get(sid)

def dept(name):
    return depts.get(name)

# ─────────────────────────────────────────────────────────────
print("\n── Tracking Keywords ─────────────────────────────────")
keywords = [
    "boston university", "bu terriers", "bu tuition", "warren towers",
    "title ix bu", "bu housing lottery", "bu research grant", "daily free press",
    "bu commencement", "questrom school", "bu campus safety", "agganis arena",
]
for kw in keywords:
    res = post("/api/v1/tracking/keywords/", {"keyword": kw, "is_active": True})
    if res:
        print(f"  ✓ \"{kw}\"")

# ─────────────────────────────────────────────────────────────
print("\n── Mentions ──────────────────────────────────────────")
mentions_data = [
    {
        "connector_id":    conn("news"),
        "source_id":       sources.get("news"),
        "content":         "Boston University announced a 4.2% tuition increase for the 2026-27 academic year, bringing annual undergraduate costs to over $62,000. Student groups are calling for greater financial aid transparency.",
        "author_handle":   "@dailyfreepress",
        "url":             "https://dailyfreepress.com/bu-tuition-hike-2026",
        "published_at":    ago(days=2, hours=3),
        "sentiment_score": -0.72,
        "sentiment_label": "negative",
        "risk_score":      8.2,
        "risk_level":      "critical",
        "topics":          '["tuition","financial aid","student protest"]',
        "department_id":   dept("Financial Affairs"),
        "status":          "new",
    },
    {
        "connector_id":    conn("twitter"),
        "source_id":       sources.get("twitter"),
        "content":         "BU Terriers WIN the 2026 Beanpot! 3-1 over BC, fourth consecutive title. Agganis Arena erupts. #BUTerriers #Beanpot",
        "author_handle":   "@BUHockey",
        "url":             "https://twitter.com/BUHockey/status/123456",
        "published_at":    ago(days=5, hours=1),
        "sentiment_score": 0.95,
        "sentiment_label": "positive",
        "risk_score":      0.3,
        "risk_level":      "low",
        "topics":          '["athletics","hockey","beanpot"]',
        "department_id":   dept("Athletics"),
        "status":          "reviewed",
    },
    {
        "connector_id":    conn("reddit"),
        "source_id":       sources.get("reddit"),
        "content":         "Warren Towers has had no hot water for THREE DAYS and facilities keeps saying 'we're working on it.' This is unacceptable for what we pay in housing fees.",
        "author_handle":   "u/BU_Frustrated_Freshman",
        "url":             "https://reddit.com/r/BostonU/comments/abc123",
        "published_at":    ago(days=1, hours=6),
        "sentiment_score": -0.63,
        "sentiment_label": "negative",
        "risk_score":      6.4,
        "risk_level":      "high",
        "topics":          '["warren towers","housing","facilities"]',
        "department_id":   dept("Housing & Residence Life"),
        "status":          "new",
    },
    {
        "connector_id":    conn("instagram"),
        "source_id":       sources.get("instagram"),
        "content":         "Class of 2026 Commencement on Nickerson Field was absolutely magical ✨ Proudest day of my life. Thank you Boston University! #BU2026 #Commencement",
        "author_handle":   "@sarahmcallister_bu",
        "url":             "https://instagram.com/p/xyz789",
        "published_at":    ago(days=10, hours=0),
        "sentiment_score": 0.97,
        "sentiment_label": "positive",
        "risk_score":      0.2,
        "risk_level":      "low",
        "topics":          '["commencement","graduation","positive campus"]',
        "department_id":   dept("Student Affairs"),
        "status":          "reviewed",
    },
    {
        "connector_id":    conn("news"),
        "source_id":       sources.get("news"),
        "content":         "A Title IX complaint filed against Boston University alleges inadequate institutional response to reported incidents in two campus programs. The Office for Civil Rights has opened an investigation.",
        "author_handle":   "@BostonGlobe",
        "url":             "https://bostonglobe.com/bu-title-ix-investigation",
        "published_at":    ago(days=0, hours=14),
        "sentiment_score": -0.89,
        "sentiment_label": "negative",
        "risk_score":      9.3,
        "risk_level":      "critical",
        "topics":          '["title ix","legal","federal investigation"]',
        "department_id":   dept("Office of the President"),
        "status":          "escalated",
    },
    {
        "connector_id":    conn("news"),
        "source_id":       sources.get("news"),
        "content":         "Boston University's Photonics Center receives $14.2M NIH grant to advance biophotonic cancer diagnostics. Lead researcher Prof. Anna Walsh calls it 'transformational for early detection.'",
        "author_handle":   "@BUToday",
        "url":             "https://bu.edu/today/photonics-nih-grant",
        "published_at":    ago(days=3, hours=9),
        "sentiment_score": 0.88,
        "sentiment_label": "positive",
        "risk_score":      0.4,
        "risk_level":      "low",
        "topics":          '["research","grant","photonics","NIH"]',
        "department_id":   dept("Research & Innovation"),
        "status":          "reviewed",
    },
    {
        "connector_id":    conn("twitter"),
        "source_id":       sources.get("twitter"),
        "content":         "BU housing lottery results dropped and half my friend group got shut out of on-campus housing again. The university is expanding enrollment but not dorm capacity. What gives? @BU_Housing",
        "author_handle":   "@terrier_class26",
        "url":             "https://twitter.com/terrier_class26/status/789012",
        "published_at":    ago(days=4, hours=2),
        "sentiment_score": -0.55,
        "sentiment_label": "negative",
        "risk_score":      5.8,
        "risk_level":      "high",
        "topics":          '["housing lottery","enrollment","capacity"]',
        "department_id":   dept("Housing & Residence Life"),
        "status":          "new",
    },
    {
        "connector_id":    conn("reddit"),
        "source_id":       sources.get("reddit"),
        "content":         "Questrom School of Business just ranked #12 nationally for undergraduate business by US News. BU is moving up across the board. Genuinely proud to be a Terrier.",
        "author_handle":   "u/QuestromProud",
        "url":             "https://reddit.com/r/BostonU/comments/def456",
        "published_at":    ago(days=7, hours=5),
        "sentiment_score": 0.91,
        "sentiment_label": "positive",
        "risk_score":      0.5,
        "risk_level":      "low",
        "topics":          '["questrom","rankings","positive campus"]',
        "department_id":   dept("Office of Communications"),
        "status":          "reviewed",
    },
]

mention_ids = {}
for i, m in enumerate(mentions_data):
    if not m["connector_id"] or not m["source_id"]:
        print(f"  ⚠ Skipping mention {i+1} — missing connector/source")
        continue
    res = post("/api/v1/mentions/", m)
    if res:
        mention_ids[i] = res["id"]
        preview = m["content"][:60].replace("\n", " ")
        print(f"  ✓ mention {res['id']} [{m['risk_level']}] — {preview}…")

# ─────────────────────────────────────────────────────────────
print("\n── Alerts ────────────────────────────────────────────")
alerts_data = [
    {
        "title":       "Title IX Federal Investigation — Immediate Response Required",
        "description": "OCR has formally opened a Title IX investigation. Legal Affairs and President's Office must coordinate a response within 48 hours.",
        "alert_type":  "risk_spike",
        "severity":    "critical",
        "mention_id":  mention_ids.get(4),   # Title IX mention
    },
    {
        "title":       "Tuition Hike Coverage Going Viral — Negative Sentiment Rising",
        "description": "Daily Free Press article on 4.2% tuition increase gaining traction on social. Risk score 8.2. Financial Affairs should prepare a proactive statement.",
        "alert_type":  "sentiment_drop",
        "severity":    "critical",
        "mention_id":  mention_ids.get(0),   # Tuition mention
    },
    {
        "title":       "Warren Towers Facilities Complaint — Reddit Traction",
        "description": "Hot water outage post gaining upvotes on r/BostonU. Housing & Residence Life should acknowledge and provide timeline.",
        "alert_type":  "volume_spike",
        "severity":    "warning",
        "mention_id":  mention_ids.get(2),   # Warren Towers mention
    },
    {
        "title":       "Housing Lottery Backlash — Capacity Concerns Trending",
        "description": "Multiple posts across Twitter and Reddit raising capacity vs enrollment concerns. Pattern suggests coordinated frustration.",
        "alert_type":  "volume_spike",
        "severity":    "warning",
        "mention_id":  mention_ids.get(6),   # Housing lottery mention
    },
]
for a in alerts_data:
    res = post("/api/v1/alerts/", a)
    if res:
        print(f"  ✓ alert {res['id']} [{res['severity']}] — {res['title'][:60]}")

# ─────────────────────────────────────────────────────────────
print("\n── Verification ──────────────────────────────────────")
final_counts = get("/api/v1/dashboard/counts")
print(f"  dashboard/counts → {final_counts}")
print("\n✅  Seed complete. The Railway database now has live BU data.\n")
print("⚠️   CORS REMINDER: set CORS_ORIGINS=https://campussphere2.netlify.app")
print("    in Railway → your service → Variables, then redeploy.\n")
