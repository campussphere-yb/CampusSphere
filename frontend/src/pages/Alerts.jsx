/**
 * Alerts — calls these backend endpoints:
 *   GET   /api/v1/alerts/open     (default view)
 *   GET   /api/v1/alerts          (all alerts, with optional severity/type filter)
 *   PATCH /api/v1/alerts/{id}     (acknowledge or resolve)
 *
 * When an alert has a mention_id, a "View mention →" link navigates to MentionDetail.
 */

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CheckCircle, Eye, ArrowRight, RefreshCw } from 'lucide-react'
import { alertsApi } from '../api/client'
import { MOCK_ALERTS } from '../api/mockData'
import Badge      from '../components/ui/Badge'
import Spinner    from '../components/ui/Spinner'
import MockBanner from '../components/ui/MockBanner'
import { useToast } from '../context/ToastContext'

const REFRESH_MS = 30_000

function fmtUpdated(d) {
  if (!d) return null
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

const TABS = ['open', 'all', 'critical']

const severityBorder = s =>
  s === 'critical' ? 'border-l-red-500'
  : s === 'warning' ? 'border-l-amber-400'
  : 'border-l-blue-400'

export default function Alerts() {
  const { toast } = useToast()
  const [alerts,       setAlerts]       = useState([])
  const [loading,      setLoading]      = useState(true)
  const [usingMock,    setUsingMock]    = useState(false)
  const [lastUpdated,  setLastUpdated]  = useState(null)
  const [tab,          setTab]          = useState('open')
  const [acting,       setActing]       = useState(null)
  const tabRef = useRef('open')

  const load = async (t = tab, silent = false) => {
    if (!silent) setLoading(true)
    try {
      let res
      if (t === 'open')          res = await alertsApi.getOpen()
      else if (t === 'critical') res = await alertsApi.list({ severity: 'critical' })
      else                       res = await alertsApi.list()

      if (res.data.length === 0) {
        setUsingMock(true)
        let data = [...MOCK_ALERTS]
        if (t === 'open')     data = data.filter(a => a.status !== 'resolved')
        if (t === 'critical') data = data.filter(a => a.severity === 'critical')
        setAlerts(data)
      } else {
        setUsingMock(false)
        setAlerts(res.data)
      }
      setLastUpdated(new Date())
    } catch {
      if (!silent) { setUsingMock(true); setAlerts(MOCK_ALERTS) }
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => { tabRef.current = tab }, [tab])

  // Initial load + 30 s auto-refresh
  useEffect(() => {
    load()
    const id = setInterval(() => load(tabRef.current, true), REFRESH_MS)
    return () => clearInterval(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const changeTab = t => { setTab(t); tabRef.current = t; load(t) }

  const act = async (id, status) => {
    setActing(id)
    const now = new Date().toISOString()
    if (usingMock) {
      setAlerts(as => as.map(a =>
        a.id === id
          ? { ...a, status, resolved_at: status === 'resolved' ? now : a.resolved_at }
          : a
      ))
      setActing(null)
      toast(status === 'resolved' ? 'Alert resolved' : 'Alert acknowledged')
      return
    }
    try {
      const res = await alertsApi.update(id, { status })
      setAlerts(as => as.map(a => a.id === id ? res.data : a))
      toast(status === 'resolved' ? 'Alert resolved' : 'Alert acknowledged')
    } catch {
      toast('Failed to update alert', 'error')
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="p-6 max-w-4xl space-y-5">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Risk Alerts</h1>
          <p className="text-sm text-gray-500">Monitor and triage system-generated alerts</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
              Live · {fmtUpdated(lastUpdated)}
            </span>
          )}
          <button
            onClick={() => load(tab)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {usingMock && <MockBanner />}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => changeTab(t)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition capitalize ${
              tab === t
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'open' ? 'Open' : t === 'all' ? 'All' : 'Critical'}
          </button>
        ))}
      </div>

      {loading
        ? <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        : alerts.length === 0
          ? (
            <div className="text-center py-16">
              <CheckCircle size={36} className="text-green-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No alerts in this view</p>
              <p className="text-gray-400 text-sm mt-1">The system is quiet — no unresolved alerts.</p>
            </div>
          )
          : (
            <div className="space-y-3">
              {alerts.map(a => (
                <div
                  key={a.id}
                  className={`bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 ${severityBorder(a.severity)} p-5`}
                >
                  <div className="flex items-start justify-between gap-4">

                    {/* Left */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge value={a.severity} />
                        <Badge value={a.status} />
                        <span className="text-[10px] text-gray-400 capitalize">
                          {a.alert_type?.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-800">{a.title}</p>
                      {a.description && (
                        <p className="text-xs text-gray-500 mt-1">{a.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <p className="text-[10px] text-gray-400">{fmtTime(a.created_at)}</p>
                        {/* Deep link to triggering mention */}
                        {a.mention_id && (
                          <Link
                            to={`/mentions/${a.mention_id}`}
                            className="flex items-center gap-0.5 text-[11px] text-indigo-600 hover:underline font-medium"
                          >
                            View mention <ArrowRight size={11} />
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 shrink-0">
                      {a.status === 'open' && (
                        <button
                          onClick={() => act(a.id, 'acknowledged')}
                          disabled={acting === a.id}
                          className="flex items-center gap-1.5 text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                        >
                          <Eye size={12} /> Acknowledge
                        </button>
                      )}
                      {a.status !== 'resolved' && (
                        <button
                          onClick={() => act(a.id, 'resolved')}
                          disabled={acting === a.id}
                          className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                        >
                          {acting === a.id ? <Spinner size="sm" /> : <CheckCircle size={12} />}
                          Resolve
                        </button>
                      )}
                      {a.status === 'resolved' && (
                        <span className="text-xs text-gray-400 italic">Resolved {fmtTime(a.resolved_at)}</span>
                      )}
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )
      }
    </div>
  )
}
