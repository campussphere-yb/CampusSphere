/**
 * Mentions Inbox — calls these backend endpoints:
 *   GET   /api/v1/mentions  (with filters + skip/limit pagination)
 *   PATCH /api/v1/mentions/{id}  (status update)
 *
 * Rows are clickable — navigates to /mentions/:id for the full detail view.
 */

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { RefreshCw, ChevronLeft, ChevronRight, CalendarDays, X } from 'lucide-react'
import { mentionsApi } from '../api/client'
import { MOCK_MENTIONS } from '../api/mockData'
import Badge      from '../components/ui/Badge'
import Spinner    from '../components/ui/Spinner'
import MockBanner from '../components/ui/MockBanner'

const PAGE_SIZE   = 20
const RISK_LEVELS = ['', 'low', 'medium', 'high', 'critical']
const SENTIMENTS  = ['', 'positive', 'neutral', 'negative']
const STATUSES    = ['', 'new', 'reviewed', 'escalated', 'resolved', 'ignored']

const PLATFORM_ICONS = {
  // Social
  twitter:          '𝕏',
  reddit:           'R',
  instagram:        'IG',
  linkedin:         'in',
  tiktok:           'TT',
  // Publications (each has its own platform_key in the DB)
  bu_today:         '📰',
  daily_free_press: '📰',
  wbur:             '📰',
  boston_globe:     '📰',
  boston_herald:    '📰',
  ghb_boston:       '📰',
  // Legacy fallback
  news:             '📰',
}

function riskColour(level) {
  return level === 'critical' ? 'text-red-600 font-bold'
    : level === 'high'        ? 'text-orange-600 font-bold'
    : level === 'medium'      ? 'text-amber-600'
    :                           'text-green-600'
}

function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function Mentions() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [mentions,  setMentions]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [usingMock, setUsingMock] = useState(false)
  const [page,      setPage]      = useState(0)
  const [hasMore,   setHasMore]   = useState(false)
  const [filters,   setFilters]   = useState({
    risk_level:      searchParams.get('risk_level')      || '',
    sentiment_label: searchParams.get('sentiment_label') || '',
    status:          searchParams.get('status')          || '',
    date_from:       searchParams.get('date_from')       || '',
    date_to:         searchParams.get('date_to')         || '',
  })
  const [showDateFilter, setShowDateFilter] = useState(false)

  // Quick date preset helpers
  const applyDatePreset = (days) => {
    const to   = new Date()
    const from = new Date()
    from.setDate(from.getDate() - days)
    const fmt = d => d.toISOString().slice(0, 10)
    const next = { ...filters, date_from: fmt(from), date_to: fmt(to) }
    setFilters(next); setPage(0); load(next, 0)
  }

  const clearDates = () => {
    const next = { ...filters, date_from: '', date_to: '' }
    setFilters(next); setPage(0); load(next, 0)
  }

  const hasDateFilter = filters.date_from || filters.date_to

  const load = async (f = filters, p = 0) => {
    setLoading(true)
    try {
      const params = {
        ...Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '')),
        skip:  p * PAGE_SIZE,
        limit: PAGE_SIZE + 1,   // fetch one extra to detect next page
      }
      const res = await mentionsApi.list(params)
      if (res.data.length === 0 && p === 0) {
        setUsingMock(true)
        let data = [...MOCK_MENTIONS]
        if (f.risk_level)      data = data.filter(m => m.risk_level      === f.risk_level)
        if (f.sentiment_label) data = data.filter(m => m.sentiment_label === f.sentiment_label)
        if (f.status)          data = data.filter(m => m.status          === f.status)
        setMentions(data)
        setHasMore(false)
      } else {
        setUsingMock(false)
        setHasMore(res.data.length > PAGE_SIZE)
        setMentions(res.data.slice(0, PAGE_SIZE))
      }
    } catch {
      setUsingMock(true)
      setMentions(MOCK_MENTIONS)
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleFilter = (key, val) => {
    const next = { ...filters, [key]: val }
    setFilters(next)
    setPage(0)
    load(next, 0)
  }

  const changePage = (delta) => {
    const next = page + delta
    if (next < 0) return
    setPage(next)
    load(filters, next)
  }

  const markStatus = async (id, status) => {
    if (usingMock) {
      setMentions(ms => ms.map(m => m.id === id ? { ...m, status } : m))
      return
    }
    try {
      const res = await mentionsApi.update(id, { status })
      setMentions(ms => ms.map(m => m.id === id ? res.data : m))
    } catch { /* silent */ }
  }

  return (
    <div className="p-6 max-w-7xl space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mentions Inbox</h1>
          <p className="text-sm text-gray-500">
            {mentions.length} mention{mentions.length !== 1 ? 's' : ''}
            {Object.values(filters).some(Boolean) ? ' (filtered)' : ''}
          </p>
        </div>
        <button
          onClick={() => { setPage(0); load(filters, 0) }}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {usingMock && <MockBanner />}

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 items-center">
          {[
            { key: 'risk_level',      label: 'Risk Level', opts: RISK_LEVELS },
            { key: 'sentiment_label', label: 'Sentiment',  opts: SENTIMENTS  },
            { key: 'status',          label: 'Status',     opts: STATUSES    },
          ].map(({ key, label, opts }) => (
            <select
              key={key}
              value={filters[key]}
              onChange={e => handleFilter(key, e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="">{label}: All</option>
              {opts.filter(Boolean).map(o => (
                <option key={o} value={o} className="capitalize">{o}</option>
              ))}
            </select>
          ))}

          {/* Date filter toggle */}
          <button
            onClick={() => setShowDateFilter(s => !s)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition ${
              hasDateFilter
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            <CalendarDays size={12} />
            {hasDateFilter ? 'Date: filtered' : 'Date range'}
          </button>
          {hasDateFilter && (
            <button onClick={clearDates} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-0.5 transition">
              <X size={11} /> Clear dates
            </button>
          )}
        </div>

        {/* Expanded date filter */}
        {showDateFilter && (
          <div className="flex flex-wrap gap-2 items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">From</label>
              <input
                type="date"
                value={filters.date_from}
                onChange={e => handleFilter('date_from', e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">To</label>
              <input
                type="date"
                value={filters.date_to}
                onChange={e => handleFilter('date_to', e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <span className="text-gray-300 text-xs">or</span>
            {[
              { label: 'Today',    days: 0  },
              { label: 'Last 7d',  days: 7  },
              { label: 'Last 30d', days: 30 },
              { label: 'Last 90d', days: 90 },
            ].map(({ label, days }) => (
              <button
                key={label}
                onClick={() => applyDatePreset(days)}
                className="text-[11px] px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      {loading
        ? <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        : mentions.length === 0
          ? <p className="text-center text-gray-400 py-16 text-sm">No mentions match the current filters.</p>
          : (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-left text-gray-500 uppercase tracking-wide text-[10px]">
                      <th className="px-4 py-3 font-medium w-[36%]">Content</th>
                      <th className="px-4 py-3 font-medium">Platform</th>
                      <th className="px-4 py-3 font-medium">Author</th>
                      <th className="px-4 py-3 font-medium">Sentiment</th>
                      <th className="px-4 py-3 font-medium">Risk</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {mentions.map(m => {
                      const isNew = m.status === 'new'
                      return (
                      <tr
                        key={m.id}
                        onClick={() => navigate(`/mentions/${m.id}`)}
                        className={`transition-colors align-top cursor-pointer
                          ${isNew
                            ? 'bg-indigo-50/60 hover:bg-indigo-100/60 border-l-[3px] border-l-indigo-500'
                            : 'hover:bg-indigo-50/40 border-l-[3px] border-l-transparent'
                          }`}
                      >
                        {/* Content */}
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2">
                            {isNew && (
                              <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            )}
                            <div className="min-w-0">
                          <p className={`line-clamp-2 leading-relaxed ${isNew ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>{m.content}</p>
                          {m.url && (
                            <a
                              href={m.url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="text-indigo-500 hover:underline text-[10px] mt-0.5 block"
                            >
                              View source ↗
                            </a>
                          )}
                            </div>
                          </div>
                        </td>
                        {/* Platform */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-slate-400">
                              {PLATFORM_ICONS[m.source?.platform_key] ?? '•'}
                            </span>
                            <span className="text-gray-600">
                              {m.source?.name ?? `Source #${m.source_id}`}
                            </span>
                          </div>
                        </td>
                        {/* Author */}
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {m.author_handle || '—'}
                        </td>
                        {/* Sentiment */}
                        <td className="px-4 py-3">
                          {m.sentiment_label
                            ? <Badge value={m.sentiment_label} />
                            : <span className="text-gray-300">—</span>
                          }
                          {m.sentiment_score != null && (
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {m.sentiment_score > 0 ? '+' : ''}{m.sentiment_score.toFixed(2)}
                            </p>
                          )}
                        </td>
                        {/* Risk */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {m.risk_score != null
                            ? <>
                                <span className={`text-sm ${riskColour(m.risk_level)}`}>
                                  {m.risk_score.toFixed(1)}
                                </span>
                                <span className="text-gray-300 text-xs"> /10</span>
                                <div className="mt-0.5"><Badge value={m.risk_level} /></div>
                              </>
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                        {/* Status — stop propagation so row click doesn't fire */}
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <select
                            value={m.status}
                            onChange={e => markStatus(m.id, e.target.value)}
                            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                          >
                            {STATUSES.filter(Boolean).map(s => (
                              <option key={s} value={s} className="capitalize">{s}</option>
                            ))}
                          </select>
                        </td>
                        {/* Time */}
                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                          {fmtTime(m.created_at)}
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {!usingMock && (page > 0 || hasMore) && (
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs text-gray-400">Page {page + 1}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => changePage(-1)}
                      disabled={page === 0}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
                    >
                      <ChevronLeft size={13} /> Previous
                    </button>
                    <button
                      onClick={() => changePage(1)}
                      disabled={!hasMore}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
                    >
                      Next <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )
      }
    </div>
  )
}
