import urllib.request, urllib.error, json

BASE = "https://campussphere-production.up.railway.app"

def post(path, payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        BASE + path, data=data,
        headers={"Content-Type": "application/json"}, method="POST"
    )
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        print("  ERROR", e.code, e.read().decode()[:200])
        return None

print("-- Keywords --")
for kw in [
    "boston university", "bu terriers", "bu tuition", "warren towers",
    "title ix bu", "bu housing lottery", "bu research grant", "daily free press",
    "bu commencement", "questrom school", "bu campus safety", "agganis arena",
]:
    r = post("/api/v1/tracking/keywords", {"keyword": kw, "is_active": True})
    print("  OK" if r else "  FAIL", kw)

print("\n-- Remaining alerts --")
r3 = post("/api/v1/alerts/", {
    "title": "Warren Towers Facilities Complaint - Reddit Traction",
    "description": "Hot water outage post gaining upvotes on r/BostonU. Housing should acknowledge.",
    "alert_type": "volume_surge", "severity": "warning", "mention_id": 3,
})
print("  alert 3:", r3.get("id") if r3 else "FAIL")

r4 = post("/api/v1/alerts/", {
    "title": "Housing Lottery Backlash - Capacity Concerns Trending",
    "description": "Multiple posts raising capacity vs enrollment concerns across Twitter and Reddit.",
    "alert_type": "volume_surge", "severity": "warning", "mention_id": 7,
})
print("  alert 4:", r4.get("id") if r4 else "FAIL")

with urllib.request.urlopen(BASE + "/api/v1/dashboard/counts") as r:
    print("\nFinal counts:", json.loads(r.read()))
