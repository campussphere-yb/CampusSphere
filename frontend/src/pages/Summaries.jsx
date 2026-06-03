/**
 * Summaries — AI-generated executive and weekly reports.
 *
 * Calls:
 *   GET  /api/v1/summaries
 *   POST /api/v1/summaries/generate
 *
 * Layout:
 *   - Three tabs: Latest | History | Generate
 *   - Latest: full narrative visible by default + mini stats + sentiment bar
 *   - History: compact accordion list of older reports
 *   - Generate: form to trigger a new summary
 */

import { useEffect, useState } from 'react'
import {
  FileText, Sparkles, ChevronDown, ChevronUp,
  TrendingUp, MessageSquare, AlertTriangle,
} from 'lucide-react'
import { summariesApi } from '../api/client'
import Badge    from '../components/ui/Badge'
import Spinner  from '../components/ui/Spinner'
import MockBanner from '../components/ui/MockBanner'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function fmtDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function riskColour(s) {
  return s >= 8 ? 'text-red-600'
    : s >= 5.5 ? 'text-orange-600'
    : s >= 3   ? 'text-amber-600'
    :             'text-green-600'
}

function riskBgColour(s) {
  return s >= 8 ? 'bg-red-50 border-red-200'
    : s >= 5.5 ? 'bg-orange-50 border-orange-200'
    : s >= 3   ? 'bg-amber-50 border-amber-200'
    :             'bg-green-50 border-green-200'
}

function parseTopics(t) {
  try { return JSON.parse(t || '[]') } catch { return [] }
}

// Format narrative paragraphs
function Narrative({ text }) {
  if (!text) return null
  const paras = text.split('\n').filter(Boolean)
  return (
    <div className="space-y-3">
      {paras.map((p, i) => (
        <p key={i} className={`text-sm leading-relaxed ${
          i === 0 ? 'font-semibold text-gray-800' : 'text-gray-600'
        }`}>{p}</p>
      ))}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SentimentMiniChart({ positive, neutral, negative }) {
  const total = (positive ?? 0) + (neutral ?? 0) + (negative ?? 0) || 1
  const rows = [
    { label: 'Positive', count: positive ?? 0, bar: 'bg-green-400' },
    { label: 'Neutral',  count: neutral  ?? 0, bar: 'bg-slate-300' },
    { label: 'Negative', count: negative ?? 0, bar: 'bg-red-400'   },
  ]
  return (
    <div className="space-y-2.5">
      {rows.map(r => (
        <div key={r.label} className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 w-14 shrink-0">{r.label}</span>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${r.bar} rounded-full`}
              style={{ width: `${Math.round((r.count / total) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-400 w-6 text-right">{r.count}</span>
        </div>
      ))}
    </div>
  )
}

// Full card for the latest summary
function LatestCard({ s }) {
  const topics = parseTopics(s.top_topics)
  const total  = (s.positive_count ?? 0) + (s.neutral_count ?? 0) + (s.negative_count ?? 0) || 1
  const posPct = Math.round(((s.positive_count ?? 0) / total) * 100)
  const neuPct = Math.round(((s.neutral_count  ?? 0) / total) * 100)
  const negPct = 100 - posPct - neuPct

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

      {/* Header strip */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles size={14} className="text-indigo-200" />
            <span className="text-white text-sm font-semibold capitalize">
              {s.summary_type} Report
            </span>
            <span className="text-indigo-200 text-xs">
              {fmtDate(s.period_start)} – {fmtDate(s.period_end)}
            </span>
          </div>
          <span className="text-indigo-200 text-[10px]">
            Generated {fmtDateTime(s.created_at)} · {s.generated_by}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-0 divide-x divide-gray-100 border-b border-gray-100">
        <div className="px-5 py-4">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <MessageSquare size={10} /> Total Mentions
          </p>
          <p className="text-2xl font-bold text-gray-900">{s.total_mentions?.toLocaleString()}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <AlertTriangle size={10} /> Avg Risk Score
          </p>
          <p className={`text-2xl font-bold ${riskColour(s.avg_risk_score)}`}>
            {s.avg_risk_score?.toFixed(1)}
            <span className="text-sm font-normal text-gray-400"> / 10</span>
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <TrendingUp size={10} /> Sentiment Split
          </p>
          {/* Sentiment bar */}
          <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
            <div className="bg-green-400 rounded-l-full"   style={{ width: `${posPct}%` }} title={`Positive ${posPct}%`} />
            <div className="bg-slate-300"                  style={{ width: `${neuPct}%` }} title={`Neutral ${neuPct}%`} />
            <div className="bg-red-400 rounded-r-full"     style={{ width: `${negPct}%` }} title={`Negative ${negPct}%`} />
          </div>
          <div className="flex gap-3 mt-1.5 text-[10px] text-gray-500">
            <span className="flex items-center gap-0.5"><span className="w-2 h-2 bg-green-400 rounded-full inline-block" />{s.positive_count} pos</span>
            <span className="flex items-center gap-0.5"><span className="w-2 h-2 bg-slate-300 rounded-full inline-block" />{s.neutral_count} neu</span>
            <span className="flex items-center gap-0.5"><span className="w-2 h-2 bg-red-400 rounded-full inline-block" />{s.negative_count} neg</span>
          </div>
        </div>
      </div>

      {/* Body: narrative + chart */}
      <div className="grid grid-cols-3 gap-0 divide-x divide-gray-100">

        {/* Narrative — 2/3 */}
        <div className="col-span-2 px-6 py-5">
          <div className="flex items-center gap-1.5 mb-4">
            <Sparkles size={12} className="text-indigo-400" />
            <span className="text-xs font-semibold text-gray-700">AI Narrative</span>
          </div>
          <Narrative text={s.narrative} />
        </div>

        {/* Right column: chart + topics — 1/3 */}
        <div className="px-5 py-5 space-y-5">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Sentiment Distribution</p>
            <SentimentMiniChart
              positive={s.positive_count}
              neutral={s.neutral_count}
              negative={s.negative_count}
            />
          </div>
          {topics.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Top Topics</p>
              <div className="flex flex-wrap gap-1.5">
                {topics.map(t => (
                  <span key={t} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[11px] font-medium capitalize">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

// Compact card for history list
function HistoryCard({ s }) {
  const [open, setOpen] = useState(false)
  const topics = parseTopics(s.top_topics)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-3.5 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge value={s.summary_type} />
            <span className="text-xs text-gray-500">
              {fmtDate(s.period_start)} – {fmtDate(s.period_end)}
            </span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            <span><span className="font-medium text-gray-800">{s.total_mentions}</span> mentions</span>
            <span className={`font-medium ${riskColour(s.avg_risk_score)}`}>Risk {s.avg_risk_score?.toFixed(1)}/10</span>
            <span>😊 {s.positive_count} · 😐 {s.neutral_count} · 😟 {s.negative_count}</span>
            {topics.length > 0 && (
              <span className="text-gray-400">Topics: {topics.join(', ')}</span>
            )}
          </div>
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          className="text-gray-400 hover:text-gray-600 shrink-0 mt-0.5"
        >
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
      {open && (
        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
          <Narrative text={s.narrative} />
        </div>
      )}
    </div>
  )
}

// ── Generate form ─────────────────────────────────────────────────────────────

const TYPES = ['weekly', 'executive', 'monthly']

function GenerateTab({ usingMock, onGenerated }) {
  const [generating, setGenerating] = useState(false)
  const [form, setForm] = useState({ summary_type: 'weekly', period_start: '', period_end: '' })

  const handleSubmit = async e => {
    e.preventDefault()
    setGenerating(true)
    try {
      const payload = {
        summary_type:  form.summary_type,
        period_start:  new Date(form.period_start).toISOString(),
        period_end:    new Date(form.period_end).toISOString(),
      }
      if (!usingMock) {
        const res = await summariesApi.generate(payload)
        onGenerated(res.data)
      } else {
        // mock: return a copy with the requested dates
        await new Promise(r => setTimeout(r, 900))
        onGenerated({
          id: Date.now(),
          summary_type:       form.summary_type,
          period_start:       payload.period_start,
          period_end:         payload.period_end,
          narrative:          `${form.summary_type.charAt(0).toUpperCase() + form.summary_type.slice(1)} Report — ${new Date(payload.period_start).toLocaleDateString()} – ${new Date(payload.period_end).toLocaleDateString()}\n\nCampusSphere detected 142 mentions across monitored platforms during this period. Overall sentiment was predominantly negative (avg score: -0.18), comprising 61 positive, 43 neutral, and 38 negative mentions.\n\nThe average risk score was 4.8 / 10.0, indicating moderate institutional exposure. Primary topics identified: athletics, admissions, finance.\n\nRecommend escalating high-risk mentions to Communications and relevant department heads for review within 24 hours.`,
          total_mentions:     142,
          avg_risk_score:     4.8,
          avg_sentiment_score:-0.18,
          positive_count:     61,
          neutral_count:      43,
          negative_count:     38,
          top_topics:         '["athletics","admissions","finance"]',
          generated_by:       'mock-ai',
          created_at:         new Date().toISOString(),
        })
      }
    } catch { /* silent */ } finally {
      setGenerating(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-800 mb-1">Generate New Summary</h2>
        <p className="text-xs text-gray-500">Choose a report type and period window. The AI will analyse all mentions in the window and produce an executive narrative.</p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Report Type</label>
          <select
            value={form.summary_type}
            onChange={e => setForm(f => ({ ...f, summary_type: e.target.value }))}
            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            {TYPES.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Period Start</label>
          <input
            required type="datetime-local" value={form.period_start}
            onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))}
            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Period End</label>
          <input
            required type="datetime-local" value={form.period_end}
            onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))}
            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={generating}
        className="flex items-center gap-2 text-sm bg-indigo-600 text-white hover:bg-indigo-700 px-5 py-2.5 rounded-lg transition disabled:opacity-50"
      >
        {generating
          ? <><Spinner size="sm" /> Generating report…</>
          : <><Sparkles size={14} /> Generate Summary</>
        }
      </button>
    </form>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const MOCK_SUMMARIES = [
  {
    id: 1,
    summary_type:       'weekly',
    period_start:       '2026-05-25T00:00:00',
    period_end:         '2026-06-01T00:00:00',
    narrative:          'Weekly Report — May 25 – June 1, 2026\n\nCampusSphere detected 158 Boston University mentions across monitored platforms this week. Overall sentiment was mixed, with a notable negative skew (avg score: −0.22) driven by two high-profile events: a Title IX investigation involving the Athletics Department, and BU\'s announced 4.9% tuition increase for Fall 2027.\n\nThe Title IX story (Daily Free Press, risk 9.3) is the highest-priority unresolved item. It has been picked up by 3 external outlets and is trending on r/BostonU with 247 upvotes. No official University statement has been issued — this is a growing communications gap.\n\nThe tuition announcement (risk 8.2) generated the highest Twitter/X engagement of the week. @DailyFreePress framing focused on "third consecutive above-inflation increase," which is dominating the narrative.\n\nCounter-positive signals: BU Terriers back-to-back Beanpot win drove strong positive engagement (+0.91), and the BU Photonics Center $12.8M NIH grant received excellent coverage (+0.93).\n\nRecommend: Issue a proactive statement on the Title IX matter through University Communications within 24 hours. Develop a financial aid messaging response to the tuition narrative. Amplify the Photonics grant story to balance the news cycle.',
    total_mentions:     158,
    avg_risk_score:     5.1,
    avg_sentiment_score:-0.22,
    positive_count:     68,
    neutral_count:      51,
    negative_count:     39,
    top_topics:         '["tuition","athletics","housing","research"]',
    generated_by:       'mock-ai',
    created_at:         '2026-06-01T10:00:00',
  },
  {
    id: 2,
    summary_type:       'weekly',
    period_start:       '2026-05-18T00:00:00',
    period_end:         '2026-05-25T00:00:00',
    narrative:          'Weekly Report — May 18 – May 25, 2026\n\nCampusSphere detected 134 BU mentions this period. Sentiment was broadly neutral-to-positive (avg: +0.09), anchored by strong Commencement coverage across Instagram and Twitter/X.\n\nThe housing lottery controversy generated moderate risk exposure (score 5.8) with complaints concentrated on r/BostonU. Student Affairs should monitor for escalation heading into summer move-out.\n\nRecommend: Engage proactively with housing narrative before fall semester communications begin.',
    total_mentions:     134,
    avg_risk_score:     3.4,
    avg_sentiment_score: 0.09,
    positive_count:     72,
    neutral_count:      44,
    negative_count:     18,
    top_topics:         '["commencement","housing","diversity","bu terriers"]',
    generated_by:       'mock-ai',
    created_at:         '2026-05-25T10:00:00',
  },
]

const TABS = ['latest', 'history', 'generate']

export default function Summaries() {
  const [summaries, setSummaries] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [usingMock, setUsingMock] = useState(false)
  const [tab,       setTab]       = useState('latest')

  const load = async () => {
    setLoading(true)
    try {
      const res = await summariesApi.list()
      if (res.data.length === 0) { setUsingMock(true); setSummaries(MOCK_SUMMARIES) }
      else                       { setUsingMock(false); setSummaries(res.data) }
    } catch {
      setUsingMock(true); setSummaries(MOCK_SUMMARIES)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleGenerated = (s) => {
    setSummaries(prev => [s, ...prev])
    setTab('latest')
  }

  const latest  = summaries[0]   ?? null
  const history = summaries.slice(1)

  return (
    <div className="p-6 max-w-5xl space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">AI Summaries</h1>
          <p className="text-sm text-gray-500">Executive and weekly AI-generated reports</p>
        </div>
      </div>

      {usingMock && <MockBanner />}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition capitalize ${
              tab === t
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'latest' ? 'Latest' : t === 'history' ? 'History' : 'Generate New'}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading
        ? <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        : tab === 'generate'
          ? <GenerateTab usingMock={usingMock} onGenerated={handleGenerated} />
          : tab === 'latest'
            ? latest
              ? <LatestCard s={latest} />
              : (
                <div className="text-center py-16">
                  <FileText size={36} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No summaries yet</p>
                  <button
                    onClick={() => setTab('generate')}
                    className="mt-3 flex items-center gap-1.5 text-xs bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-lg transition mx-auto"
                  >
                    <Sparkles size={12} /> Generate first report
                  </button>
                </div>
              )
            : /* history tab */
              history.length === 0
              ? (
                <div className="text-center py-10">
                  <p className="text-gray-400 text-sm">No previous reports.</p>
                </div>
              )
              : (
                <div className="space-y-3">
                  {history.map(s => <HistoryCard key={s.id} s={s} />)}
                </div>
              )
      }
    </div>
  )
}
