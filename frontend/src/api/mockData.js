/**
 * api/mockData.js — Fallback demo data shown when the backend returns empty results.
 *
 * These values mirror the shape of real API responses so mock and live modes are identical.
 * An amber MockBanner appears on each page when mock data is active.
 *
 * All data reflects Boston University (BU) monitoring scenarios.
 */

export const MOCK_COUNTS = { new_mentions: 9, open_alerts: 12 }

export const MOCK_AI_INSIGHT = {
  text: "BU tuition announcement and Terriers athletics coverage are driving a split in public sentiment — 4 high-risk mentions require active response from Communications and Athletics.",
  subtitle: "Avg risk 5.1/10 · Primary topics: tuition, athletics, housing, research",
  generated_at: "2026-06-01T10:00:00",
  generated_by: "mock-ai",
}

export const MOCK_OVERVIEW = {
  total_mentions:      158,
  open_alerts:         9,
  avg_risk_score:      5.1,
  sentiment_breakdown: { positive: 68, neutral: 51, negative: 39 },
  risk_breakdown:      { low: 79, medium: 47, high: 23, critical: 9 },
  // Derived fields
  high_risk_count:     32,
  positive_pct:        43,
  positive_count:      68,
  new_mentions:        9,
  resolved_count:      37,
}

export const MOCK_RISK_TREND = [
  { date: '2026-05-22', avg_risk: 2.1, mention_count: 8  },
  { date: '2026-05-23', avg_risk: 2.9, mention_count: 11 },
  { date: '2026-05-24', avg_risk: 3.6, mention_count: 16 },
  { date: '2026-05-25', avg_risk: 3.2, mention_count: 13 },
  { date: '2026-05-26', avg_risk: 5.8, mention_count: 27 },
  { date: '2026-05-27', avg_risk: 7.2, mention_count: 34 },
  { date: '2026-05-28', avg_risk: 6.1, mention_count: 29 },
  { date: '2026-05-29', avg_risk: 4.8, mention_count: 21 },
  { date: '2026-05-30', avg_risk: 4.2, mention_count: 17 },
  { date: '2026-05-31', avg_risk: 5.1, mention_count: 24 },
  { date: '2026-06-01', avg_risk: 5.4, mention_count: 26 },
]

export const MOCK_TRENDING_TOPICS = [
  { topic: 'tuition',       count: 412, sentiment_label: 'negative', avg_sentiment: -0.61 },
  { topic: 'housing',       count: 358, sentiment_label: 'negative', avg_sentiment: -0.48 },
  { topic: 'bu terriers',   count: 311, sentiment_label: 'positive', avg_sentiment:  0.72 },
  { topic: 'research',      count: 267, sentiment_label: 'positive', avg_sentiment:  0.65 },
  { topic: 'diversity',     count: 219, sentiment_label: 'negative', avg_sentiment: -0.34 },
  { topic: 'commencement',  count: 194, sentiment_label: 'positive', avg_sentiment:  0.81 },
]

export const MOCK_TOP_SOURCES = [
  { source_id: 1, platform_name: 'Twitter / X',    platform_key: 'twitter',   mention_count: 68, pct: 43 },
  { source_id: 2, platform_name: 'Reddit',          platform_key: 'reddit',    mention_count: 44, pct: 28 },
  { source_id: 3, platform_name: 'Instagram',       platform_key: 'instagram', mention_count: 30, pct: 19 },
  { source_id: 4, platform_name: 'BU Today / News', platform_key: 'news',      mention_count: 16, pct: 10 },
]

export const MOCK_MENTIONS = [
  {
    id: 1,
    connector_id: 1,
    source_id: 1,
    source: { id: 1, name: 'Twitter / X', platform_key: 'twitter' },
    content: "BU just announced another tuition hike — 4.9% increase for Fall 2027. That's the third consecutive year of above-inflation increases. Students on financial aid are getting crushed.",
    author_handle: '@DailyFreePress',
    url: 'https://twitter.com/DailyFreePress/status/example1',
    sentiment_score: -0.74,
    sentiment_label: 'negative',
    risk_score: 8.2,
    risk_level: 'critical',
    topics: '["tuition","finance"]',
    status: 'escalated',
    department_id: null,
    notes: null,
    created_at: '2026-06-01T09:14:00',
  },
  {
    id: 2,
    connector_id: 1,
    source_id: 1,
    source: { id: 1, name: 'Twitter / X', platform_key: 'twitter' },
    content: "Incredibly proud of @BUTerriers men's hockey — back-to-back Beanpot champions! The energy at Agganis Arena tonight was electric. Go BU! 🔴⚪",
    author_handle: '@BostonUniversity',
    url: 'https://twitter.com/BostonUniversity/status/example2',
    sentiment_score: 0.91,
    sentiment_label: 'positive',
    risk_score: 0.3,
    risk_level: 'low',
    topics: '["bu terriers","athletics"]',
    status: 'reviewed',
    department_id: null,
    notes: null,
    created_at: '2026-06-01T08:02:00',
  },
  {
    id: 3,
    connector_id: 2,
    source_id: 2,
    source: { id: 2, name: 'Reddit', platform_key: 'reddit' },
    content: "The Warren Towers housing lottery is an absolute disaster again. Rising seniors getting bumped to off-campus with 3 weeks notice. BU admin doesn't care about students at all.",
    author_handle: 'u/BU_housing_rant',
    url: 'https://reddit.com/r/BostonU/comments/example3',
    sentiment_score: -0.68,
    sentiment_label: 'negative',
    risk_score: 6.4,
    risk_level: 'high',
    topics: '["housing","administration"]',
    status: 'new',
    department_id: null,
    notes: null,
    created_at: '2026-06-01T07:48:00',
  },
  {
    id: 4,
    connector_id: 3,
    source_id: 3,
    source: { id: 3, name: 'Instagram', platform_key: 'instagram' },
    content: 'Class of 2026 Commencement on Nickerson Field was absolutely beautiful 🎓 So proud to be a Terrier! Best 4 years of my life @BostonUniversity',
    author_handle: '@bu_grad_2026',
    url: 'https://instagram.com/p/example4',
    sentiment_score: 0.88,
    sentiment_label: 'positive',
    risk_score: 0.2,
    risk_level: 'low',
    topics: '["commencement","academics"]',
    status: 'resolved',
    department_id: null,
    notes: null,
    created_at: '2026-05-31T18:45:00',
  },
  {
    id: 5,
    connector_id: 4,
    source_id: 4,
    source: { id: 4, name: 'BU Today / News', platform_key: 'news' },
    content: "Boston University assistant athletics director placed on administrative leave amid Title IX investigation. University has not issued a public statement. Students demanding transparency.",
    author_handle: '@TheDailyFreePress',
    url: 'https://dailyfreepress.com/example5',
    sentiment_score: -0.86,
    sentiment_label: 'negative',
    risk_score: 9.3,
    risk_level: 'critical',
    topics: '["athletics","campus safety","administration"]',
    status: 'escalated',
    department_id: null,
    notes: null,
    created_at: '2026-05-31T14:22:00',
  },
  {
    id: 6,
    connector_id: 1,
    source_id: 1,
    source: { id: 1, name: 'Twitter / X', platform_key: 'twitter' },
    content: "Massive congratulations to BU's Photonics Center — $12.8M NIH grant to advance imaging technology for cancer detection. This is what BU Research is all about! 🔬",
    author_handle: '@BUResearch',
    url: 'https://twitter.com/BUResearch/status/example6',
    sentiment_score: 0.93,
    sentiment_label: 'positive',
    risk_score: 0.4,
    risk_level: 'low',
    topics: '["research","academics"]',
    status: 'reviewed',
    department_id: null,
    notes: null,
    created_at: '2026-05-30T11:30:00',
  },
]

export const MOCK_ALERTS = [
  {
    id: 1,
    title: 'Critical: Title IX investigation coverage going viral',
    description: 'BU Daily Free Press article (risk 9.3) trending across Twitter/X and Reddit. University has not issued statement.',
    alert_type: 'risk_spike',
    severity: 'critical',
    status: 'open',
    mention_id: 5,
    created_at: '2026-05-31T14:24:00',
    resolved_at: null,
  },
  {
    id: 2,
    title: 'High-risk: Tuition hike driving negative sentiment surge',
    description: 'Risk score 8.2 — @DailyFreePress tuition post gaining traction. Negative sentiment up 38% in last 12 hours.',
    alert_type: 'sentiment_drop',
    severity: 'critical',
    status: 'open',
    mention_id: 1,
    created_at: '2026-06-01T09:16:00',
    resolved_at: null,
  },
  {
    id: 3,
    title: 'Housing lottery complaint thread gaining traction on r/BostonU',
    description: 'Reddit thread has 247 upvotes and 89 comments. Risk score 6.4.',
    alert_type: 'volume_surge',
    severity: 'warning',
    status: 'acknowledged',
    mention_id: 3,
    created_at: '2026-06-01T08:00:00',
    resolved_at: null,
  },
  {
    id: 4,
    title: 'Volume spike: 34 BU mentions in past 24 hours',
    description: 'Unusual mention volume — 2.1× above the 30-day average. Driven primarily by tuition and athletics coverage.',
    alert_type: 'volume_surge',
    severity: 'warning',
    status: 'open',
    mention_id: null,
    created_at: '2026-05-27T20:00:00',
    resolved_at: null,
  },
]

export const MOCK_CONNECTORS = [
  { id: 1, name: 'Twitter/X — BU Monitor',  source_id: 1, status: 'active',  credential_store: 'mock',    credential_ref: 'mock://twitter-bu-dev',         last_synced_at: '2026-06-01T09:00:00', created_at: '2026-05-20T10:00:00' },
  { id: 2, name: 'Reddit — r/BostonU',       source_id: 2, status: 'active',  credential_store: 'mock',    credential_ref: 'mock://reddit-bu-dev',           last_synced_at: '2026-06-01T08:30:00', created_at: '2026-05-20T10:05:00' },
  { id: 3, name: 'BU Today / News Scraper',  source_id: 4, status: 'paused',  credential_store: 'env_var', credential_ref: 'CAMPUSSPHERE_NEWS_API_KEY',      last_synced_at: '2026-05-30T12:00:00', created_at: '2026-05-21T09:00:00' },
]

export const MOCK_SOURCES = [
  { id: 1, name: 'Twitter / X',       platform_key: 'twitter',   base_url: 'https://twitter.com',           is_active: true,  created_at: '2026-05-20T10:00:00' },
  { id: 2, name: 'Reddit',            platform_key: 'reddit',    base_url: 'https://reddit.com/r/BostonU',  is_active: true,  created_at: '2026-05-20T10:00:00' },
  { id: 3, name: 'Instagram',         platform_key: 'instagram', base_url: 'https://instagram.com',         is_active: true,  created_at: '2026-05-20T10:00:00' },
  { id: 4, name: 'BU Today / News',   platform_key: 'news',      base_url: 'https://butoday.bu.edu',        is_active: false, created_at: '2026-05-21T09:00:00' },
]

export const MOCK_DEPARTMENTS = [
  { id: 1, name: 'University Communications', description: 'Office of University Communications' },
  { id: 2, name: 'Legal Affairs',             description: 'Office of General Counsel' },
  { id: 3, name: 'Student Affairs',           description: 'Dean of Students Office' },
  { id: 4, name: 'Athletics',                 description: 'Department of Athletics' },
  { id: 5, name: 'Academic Affairs',          description: 'Office of the Provost' },
  { id: 6, name: 'Financial Affairs',         description: 'Office of Financial Affairs' },
  { id: 7, name: 'Housing',                   description: 'BU Residence Life' },
]

export const MOCK_KEYWORDS = [
  { id: 1,  keyword: 'boston university',      category: 'brand',      is_active: true,  created_at: '2026-05-01T00:00:00' },
  { id: 2,  keyword: 'bu terriers',            category: 'brand',      is_active: true,  created_at: '2026-05-01T00:00:00' },
  { id: 3,  keyword: 'bu tuition',             category: 'reputation', is_active: true,  created_at: '2026-05-02T00:00:00' },
  { id: 4,  keyword: 'warren towers',          category: 'reputation', is_active: true,  created_at: '2026-05-03T00:00:00' },
  { id: 5,  keyword: 'title ix bu',            category: 'crisis',     is_active: true,  created_at: '2026-05-04T00:00:00' },
  { id: 6,  keyword: 'bu housing lottery',     category: 'reputation', is_active: true,  created_at: '2026-05-05T00:00:00' },
  { id: 7,  keyword: 'bu research grant',      category: 'brand',      is_active: true,  created_at: '2026-05-06T00:00:00' },
  { id: 8,  keyword: 'daily free press',       category: 'general',    is_active: true,  created_at: '2026-05-07T00:00:00' },
  { id: 9,  keyword: 'bu commencement',        category: 'brand',      is_active: true,  created_at: '2026-05-08T00:00:00' },
  { id: 10, keyword: 'questrom school',        category: 'brand',      is_active: false, created_at: '2026-05-09T00:00:00' },
  { id: 11, keyword: 'bu campus safety',       category: 'crisis',     is_active: true,  created_at: '2026-05-10T00:00:00' },
  { id: 12, keyword: 'agganis arena',          category: 'general',    is_active: false, created_at: '2026-05-11T00:00:00' },
]
