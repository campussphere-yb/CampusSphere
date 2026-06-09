/**
 * Dashboard — calls these backend endpoints:
 *   GET /api/v1/dashboard/overview
 *   GET /api/v1/dashboard/ai-insight
 *   GET /api/v1/dashboard/risk-trend?days=30
 *   GET /api/v1/dashboard/trending-topics
 *   GET /api/v1/dashboard/top-sources
 *   GET /api/v1/dashboard/recent-mentions?limit=6
 *   GET /api/v1/dashboard/recent-alerts?limit=6
 */

import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { Sparkles, TrendingUp, AlertTriangle, ArrowRight, Download, RefreshCw } from 'lucide-react'

const REFRESH_MS = 30_000

function fmtUpdated(d) {
  if (!d) return null
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
import { dashboardApi } from '../api/client'
import {
  MOCK_OVERVIEW, MOCK_RISK_TREND, MOCK_MENTIONS, MOCK_ALERTS,
  MOCK_AI_INSIGHT, MOCK_TRENDING_TOPICS, MOCK_TOP_SOURCES,
} from '../api/mockData'
import Badge     from '../components/ui/Badge'
import Spinner   from '../components/ui/Spinner'
import MockBanner from '../components/ui/MockBanner'
import { useToast } from '../context/ToastContext'

// ── Helpers ───────────────────────────────────────────────────────────────────

function riskColour(level) {
  return level === 'critical' ? 'text-red-500'
    : level === 'high'        ? 'text-orange-500'
    : level === 'medium'      ? 'text-amber-500'
    :                           'text-green-500'
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function riskLevelOf(score) {
  if (score == null) return 'low'
  return score >= 8 ? 'critical' : score >= 5.5 ? 'high' : score >= 3 ? 'medium' : 'low'
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, valueClass = 'text-gray-900', accentClass = 'border-l-slate-300' }) {
  return (
    <div className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 border-l-4 ${accentClass}`}>
      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">{label}</p>
      <p className={`text-2xl font-bold mt-1.5 ${valueClass}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function TopicBar({ topic, count, maxCount, sentimentLabel }) {
  const pct = Math.round((count / maxCount) * 100)
  const barColour =
    sentimentLabel === 'negative' ? 'bg-red-400'
    : sentimentLabel === 'positive' ? 'bg-green-400'
    : 'bg-amber-400'
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-28 shrink-0 capitalize">{topic}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${barColour} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right">{count}</span>
    </div>
  )
}

function PlatformBar({ platform_name, mention_count, pct }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-24 shrink-0 truncate">{platform_name}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-7 text-right">{pct}%</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

// ── CSV export ────────────────────────────────────────────────────────────────

function exportCSV(overview, trend, mentions) {
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const rows = [
    ['CampusSphere Export', new Date().toLocaleString()],
    [],
    ['SUMMARY'],
    ['Total Mentions', overview.total_mentions],
    ['Avg Risk Score',  overview.avg_risk_score?.toFixed(2)],
    ['Positive %',     (overview.positive_pct ?? 0) + '%'],
    ['Open Alerts',    overview.open_alerts],
    ['High-Risk Posts',overview.high_risk_count ?? 0],
    ['Resolved',       overview.resolved_count ?? 0],
    [],
    ['RISK TREND'],
    ['Date', 'Avg Risk', 'Mention Count'],
    ...trend.map(t => [t.date, t.avg_risk, t.mention_count]),
    [],
    ['RECENT MENTIONS'],
    ['Content', 'Platform', 'Author', 'Sentiment', 'Risk Score', 'Risk Level', 'Status', 'Time'],
    ...mentions.map(m => [
      esc(m.content),
      esc(m.source?.name ?? `Source #${m.source_id}`),
      esc(m.author_handle ?? ''),
      esc(m.sentiment_label ?? ''),
      m.risk_score?.toFixed(1) ?? '',
      m.risk_level ?? '',
      m.status ?? '',
      m.created_at ? new Date(m.created_at).toLocaleString() : '',
    ]),
  ]
  const csv = rows.map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `campussphere-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [overview,      setOverview]      = useState(null)
  const [insight,       setInsight]       = useState(null)
  const [trend,         setTrend]         = useState([])
  const [topics,        setTopics]        = useState([])
  const [sources,       setSources]       = useState([])
  const [mentions,      setMentions]      = useState([])
  const [alerts,        setAlerts]        = useState([])
  const [loading,       setLoading]       = useState(true)
  const [refreshing,    setRefreshing]    = useState(false)
  const [usingMock,     setUsingMock]     = useState(false)
  const [lastUpdated,   setLastUpdated]   = useState(null)
  const { toast } = useToast()
  const [days,          setDays]          = useState(30)
  const [trendLoading,  setTrendLoading]  = useState(false)

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else         setRefreshing(true)
    try {
      const [ovRes, inRes, trRes, tpRes, srRes, mnRes, alRes] = await Promise.all([
        dashboardApi.getOverview(),
        dashboardApi.getAiInsight(),
        dashboardApi.getRiskTrend(days),
        dashboardApi.getTrendingTopics(6),
        dashboardApi.getTopSources(5),
        dashboardApi.getRecentMentions(6),
        dashboardApi.getRecentAlerts(6),
      ])

      if (ovRes.data.total_mentions === 0) {
        setUsingMock(true)
        setOverview(MOCK_OVERVIEW)
        setInsight(MOCK_AI_INSIGHT)
        setTrend(MOCK_RISK_TREND)
        setTopics(MOCK_TRENDING_TOPICS)
        setSources(MOCK_TOP_SOURCES)
        setMentions(MOCK_MENTIONS)
        setAlerts(MOCK_ALERTS)
      } else {
        setUsingMock(false)
        setOverview(ovRes.data)
        setInsight(inRes.data)
        setTrend(trRes.data)
        setTopics(tpRes.data)
        setSources(srRes.data)
        setMentions(mnRes.data)
        setAlerts(alRes.data)
      }
      setLastUpdated(new Date())
    } catch {
      if (!silent) {
        setUsingMock(true)
        setOverview(MOCK_OVERVIEW)
        setInsight(MOCK_AI_INSIGHT)
        setTrend(MOCK_RISK_TREND)
        setTopics(MOCK_TRENDING_TOPICS)
        setSources(MOCK_TOP_SOURCES)
        setMentions(MOCK_MENTIONS)
        setAlerts(MOCK_ALERTS)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [days]) // eslint-disable-line react-hooks/exhaustive-deps

  // Initial load + 30 s auto-refresh
  useEffect(() => {
    loadAll()
    const id = setInterval(() => loadAll(true), REFRESH_MS)
    return () => clearInterval(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const changeDays = async (d) => {
    setDays(d)
    setTrendLoading(true)
    try {
      const res = await dashboardApi.getRiskTrend(d)
      setTrend(res.data.length > 0 ? res.data : MOCK_RISK_TREND.slice(-d))
    } catch {
      setTrend(MOCK_RISK_TREND.slice(-d))
    } finally {
      setTrendLoading(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
  )

  const rb    = overview.risk_breakdown ?? {}
  const rbTot = Object.values(rb).reduce((a, b) => a + b, 0) || 1
  const avgRisk = overview.avg_risk_score
  const highRiskMentions = mentions.filter(m =>
    m.risk_level === 'critical' || m.risk_level === 'high'
  ).slice(0, 4)
  const maxTopicCount = topics[0]?.count || 1

  return (
    <div className="p-6 max-w-7xl space-y-5">

      {/* ── Page header with live indicator + export ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Real-time reputation monitoring overview</p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
              Live · {fmtUpdated(lastUpdated)}
            </span>
          )}
          <button
            onClick={() => loadAll(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Updating…' : 'Refresh'}
          </button>
          <button
            onClick={() => { exportCSV(overview, trend, mentions); toast('Report exported to CSV', 'info') }}
            className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {usingMock && <MockBanner />}

      {/* ── AI Hero Banner ── */}
      {insight && (
        <div className="bg-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 flex items-start gap-6">
            {/* Left — narrative */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={13} className="text-indigo-400 shrink-0" />
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                  AI Executive Insight
                </span>
                <span className="text-slate-600 text-[10px]">· {fmtDate(insight.generated_at)}</span>
              </div>
              <p className="text-white text-lg font-bold leading-snug mb-2">{insight.text}</p>
              <p className="text-slate-400 text-sm">{insight.subtitle}</p>
            </div>
            {/* Right — key metrics */}
            <div className="shrink-0 flex flex-col gap-3 min-w-[140px]">
              <div className="bg-slate-700/60 rounded-xl px-4 py-3 text-right">
                <p className="text-slate-400 text-[10px] uppercase tracking-wide">Mentions This Week</p>
                <p className="text-white text-2xl font-bold mt-0.5">{overview.total_mentions.toLocaleString()}</p>
              </div>
              <div className="bg-slate-700/60 rounded-xl px-4 py-3 text-right">
                <p className="text-slate-400 text-[10px] uppercase tracking-wide">Critical Alerts</p>
                <p className={`text-2xl font-bold mt-0.5 ${overview.open_alerts > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {overview.open_alerts}
                </p>
                {overview.open_alerts > 0 && (
                  <p className="text-red-400 text-[10px]">Action required</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Mentions"
          value={overview.total_mentions.toLocaleString()}
          sub="Across all active sources"
          accentClass="border-l-indigo-500"
        />
        <StatCard
          label="Positive Sentiment"
          value={`${overview.positive_pct ?? Math.round((overview.sentiment_breakdown?.positive ?? 0) / Math.max(overview.total_mentions, 1) * 100)}%`}
          sub={`${overview.positive_count ?? overview.sentiment_breakdown?.positive ?? 0} of ${overview.total_mentions} positive`}
          valueClass="text-green-600"
          accentClass="border-l-green-500"
        />
        <StatCard
          label="High-Risk Posts"
          value={overview.high_risk_count ?? (overview.risk_breakdown?.critical ?? 0) + (overview.risk_breakdown?.high ?? 0)}
          sub="Require team response"
          valueClass="text-red-600"
          accentClass="border-l-red-500"
        />
        <StatCard
          label="Resolved"
          value={overview.resolved_count ?? 0}
          sub={`of ${overview.total_mentions} mentions`}
          valueClass="text-slate-700"
          accentClass="border-l-blue-400"
        />
      </div>

      {/* ── Risk trend + Trending topics ── */}
      <div className="grid grid-cols-3 gap-4">

        {/* Risk Trend chart */}
        <div className="col-span-2 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-indigo-400" />
              <h2 className="text-sm font-semibold text-gray-700">Risk Score Trend</h2>
              {trendLoading && <span className="text-[10px] text-indigo-400 animate-pulse">Updating…</span>}
            </div>
            <div className="flex gap-1">
              {[7, 14, 30, 90].map(d => (
                <button
                  key={d}
                  onClick={() => changeDays(d)}
                  className={`text-[11px] px-2 py-0.5 rounded transition ${
                    days === d
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trend} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={d => d?.slice(5)} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip
                formatter={v => [`${v}`, 'Avg Risk']}
                labelFormatter={l => `Date: ${l}`}
                contentStyle={{ fontSize: 12 }}
              />
              <Line
                type="monotone" dataKey="avg_risk" stroke="#6366f1" strokeWidth={2}
                dot={false} activeDot={{ r: 4, fill: '#6366f1' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Trending Topics */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Trending Topics</h2>
            <span className="text-[10px] text-gray-400">Top {topics.length}</span>
          </div>
          {topics.length === 0
            ? <p className="text-xs text-gray-400 text-center py-8">No topic data yet</p>
            : (
              <div className="space-y-3">
                {topics.map(t => (
                  <TopicBar
                    key={t.topic}
                    topic={t.topic}
                    count={t.count}
                    maxCount={maxTopicCount}
                    sentimentLabel={t.sentiment_label}
                  />
                ))}
              </div>
            )
          }
        </div>

      </div>

      {/* ── High-risk highlights + Right column ── */}
      <div className="grid grid-cols-3 gap-4">

        {/* High-Risk Highlights */}
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-400" />
              <h2 className="text-sm font-semibold text-gray-700">Matters Requiring Attention</h2>
            </div>
            <Link to="/mentions?risk_level=high" className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {highRiskMentions.length === 0
            ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-green-600 font-medium">✓ No high-risk mentions</p>
                <p className="text-xs text-gray-400 mt-1">All clear for now</p>
              </div>
            )
            : (
              <div className="divide-y divide-gray-50">
                {highRiskMentions.map(m => (
                  <Link
                    key={m.id}
                    to={`/mentions/${m.id}`}
                    className="block px-5 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge value={m.risk_level} />
                        <Badge value={m.status} />
                        <span className="text-[10px] text-gray-400">
                          {m.source?.name ?? `Source #${m.source_id}`} · {m.author_handle || 'Anonymous'}
                        </span>
                      </div>
                      <span className={`text-sm font-bold shrink-0 ${riskColour(m.risk_level)}`}>
                        {m.risk_score?.toFixed(1)}/10
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">{m.content}</p>
                    <p className="text-[10px] text-gray-400 mt-1.5">{fmtDate(m.created_at)}</p>
                  </Link>
                ))}
              </div>
            )
          }
        </div>

        {/* Right column: Platform Distribution + Risk Breakdown */}
        <div className="space-y-4">

          {/* Platform Distribution */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Platform Distribution</h2>
            {sources.length === 0
              ? <p className="text-xs text-gray-400 text-center py-4">No source data</p>
              : (
                <div className="space-y-3">
                  {sources.map(s => (
                    <PlatformBar key={s.source_id} {...s} />
                  ))}
                </div>
              )
            }
          </div>

          {/* Risk Breakdown */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Risk Breakdown</h2>
            <div className="space-y-3">
              {[
                { key: 'critical', label: 'Critical', bar: 'bg-red-500'    },
                { key: 'high',     label: 'High',     bar: 'bg-orange-400' },
                { key: 'medium',   label: 'Medium',   bar: 'bg-amber-400'  },
                { key: 'low',      label: 'Low',      bar: 'bg-green-400'  },
              ].map(({ key, label, bar }) => {
                const count = rb[key] ?? 0
                const pct   = Math.round((count / rbTot) * 100)
                return (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{label}</span>
                      <span className="text-gray-500 font-medium">{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${bar} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      </div>

      {/* ── Open Alerts ── */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Open Alerts</h2>
            <Link to="/alerts" className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {alerts.map(a => (
              <div key={a.id} className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Badge value={a.severity} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{a.title}</p>
                    <p className="text-[10px] text-gray-400 capitalize">{a.alert_type?.replace(/_/g, ' ')}</p>
                  </div>
                </div>
                {a.mention_id && (
                  <Link
                    to={`/mentions/${a.mention_id}`}
                    className="text-[11px] text-indigo-600 hover:underline shrink-0"
                  >
                    View mention →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
