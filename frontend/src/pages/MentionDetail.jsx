/**
 * MentionDetail — /mentions/:id
 *
 * Full detail view for a single mention. Calls:
 *   GET   /api/v1/mentions/:id
 *   GET   /api/v1/departments
 *   PATCH /api/v1/mentions/:id  (status, department, notes)
 *   POST  /api/v1/mentions/:id/suggested-responses
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Sparkles, ExternalLink, Tag } from 'lucide-react'
import { mentionsApi, departmentsApi } from '../api/client'
import { MOCK_MENTIONS, MOCK_DEPARTMENTS } from '../api/mockData'
import Badge    from '../components/ui/Badge'
import Spinner  from '../components/ui/Spinner'
import { useToast } from '../context/ToastContext'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtFull(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short',
    day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function riskColour(level) {
  return level === 'critical' ? 'text-red-600'
    : level === 'high'        ? 'text-orange-600'
    : level === 'medium'      ? 'text-amber-600'
    :                           'text-green-600'
}

function parseTopics(t) {
  try { return JSON.parse(t || '[]') } catch { return [] }
}

// ── AI Analysis panel ─────────────────────────────────────────────────────────

function AiAnalysisPanel({ mention }) {
  const topics = parseTopics(mention.topics)
  return (
    <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 space-y-3">
      <div className="flex items-center gap-1.5">
        <Sparkles size={13} className="text-indigo-500" />
        <span className="text-xs font-semibold text-indigo-700">AI Analysis</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Sentiment */}
        <div className="bg-white rounded-lg p-3 border border-indigo-100">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Sentiment</p>
          {mention.sentiment_label
            ? <>
                <Badge value={mention.sentiment_label} />
                {mention.sentiment_score != null && (
                  <p className="text-xs text-gray-500 mt-1">
                    Score: {mention.sentiment_score > 0 ? '+' : ''}{mention.sentiment_score.toFixed(3)}
                  </p>
                )}
              </>
            : <span className="text-xs text-gray-400">Not analysed</span>
          }
        </div>

        {/* Risk */}
        <div className="bg-white rounded-lg p-3 border border-indigo-100">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Risk Score</p>
          {mention.risk_score != null
            ? <>
                <span className={`text-lg font-bold ${riskColour(mention.risk_level)}`}>
                  {mention.risk_score.toFixed(1)}
                </span>
                <span className="text-gray-400 text-xs"> / 10</span>
                <div className="mt-1"><Badge value={mention.risk_level} /></div>
              </>
            : <span className="text-xs text-gray-400">Not scored</span>
          }
        </div>
      </div>

      {/* Topic tags */}
      {topics.length > 0 && (
        <div>
          <div className="flex items-center gap-1 mb-2">
            <Tag size={11} className="text-indigo-400" />
            <span className="text-[10px] text-indigo-600 font-medium uppercase tracking-wide">Auto-Tags</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {topics.map(t => (
              <span
                key={t}
                className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[11px] font-medium capitalize"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MentionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [mention,     setMention]     = useState(null)
  const [departments, setDepartments] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [usingMock,   setUsingMock]   = useState(false)
  const [notes,       setNotes]       = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [response,    setResponse]    = useState(null)
  const [generating,  setGenerating]  = useState(false)
  const [patching,    setPatching]    = useState(false)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [mRes, dRes] = await Promise.all([
          mentionsApi.get(id),
          departmentsApi.list(),
        ])
        let loaded = mRes.data
        setNotes(loaded.notes || '')
        setDepartments(dRes.data.length > 0 ? dRes.data : MOCK_DEPARTMENTS)

        // ── Auto mark-as-read ──────────────────────────────────────────────────
        // Opening a "new" mention counts as reading it — flip to "reviewed"
        // silently so the inbox unread count and blue dot both clear.
        if (loaded.status === 'new') {
          try {
            const updated = await mentionsApi.update(id, { status: 'reviewed' })
            loaded = updated.data
            // Tell the Sidebar to re-fetch counts immediately
            window.dispatchEvent(new CustomEvent('mention:statusChanged'))
          } catch { /* non-fatal — don't break the detail view */ }
        }

        setMention(loaded)
      } catch {
        // Fall back to mock
        const mock = MOCK_MENTIONS.find(m => m.id === parseInt(id))
        if (mock) {
          setMention(mock)
          setNotes(mock.notes || '')
          setUsingMock(true)
        } else {
          navigate('/mentions')
        }
        setDepartments(MOCK_DEPARTMENTS)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [id])

  const patch = async (fields) => {
    if (usingMock) {
      setMention(m => ({ ...m, ...fields }))
      toast('Changes saved')
      return
    }
    setPatching(true)
    try {
      const res = await mentionsApi.update(id, fields)
      setMention(res.data)
      toast('Changes saved')
    } catch {
      toast('Failed to save changes', 'error')
    } finally {
      setPatching(false)
    }
  }

  const saveNotes = async () => {
    if (notes === (mention?.notes || '')) return
    setSavingNotes(true)
    if (usingMock) {
      setMention(m => ({ ...m, notes }))
      setSavingNotes(false)
      toast('Notes saved', 'info')
      return
    }
    await patch({ notes })
    setSavingNotes(false)
  }

  const handleDepartmentChange = (e) => {
    const dept_id = e.target.value ? parseInt(e.target.value) : null
    patch({ department_id: dept_id })
  }

  const handleStatusChange = (e) => {
    patch({ status: e.target.value })
  }

  const generateResponse = async () => {
    setGenerating(true)
    try {
      if (usingMock) {
        await new Promise(r => setTimeout(r, 700))
        setResponse('Thank you for bringing this to our attention. We take all concerns seriously and are actively reviewing the matter. For direct assistance, please contact our Communications Office.')
      } else {
        const res = await mentionsApi.generateResponse(id)
        setResponse(res.data.content)
      }
    } catch { /* silent */ } finally {
      setGenerating(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
  )
  if (!mention) return null

  const currentDept = departments.find(d => d.id === mention.department_id)
  const STATUSES = ['new', 'reviewed', 'escalated', 'resolved', 'ignored']

  return (
    <div className="p-6 max-w-5xl space-y-5">

      {/* Back nav */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/mentions')}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition"
        >
          <ArrowLeft size={14} /> Back to Mentions
        </button>
        {usingMock && (
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
            Demo data
          </span>
        )}
      </div>

      {/* Content card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge value={mention.risk_level} />
            <Badge value={mention.status} />
            {mention.sentiment_label && <Badge value={mention.sentiment_label} />}
          </div>
          {mention.url && (
            <a
              href={mention.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-indigo-500 hover:underline shrink-0"
            >
              Open original <ExternalLink size={11} />
            </a>
          )}
        </div>

        <p className="text-gray-800 text-sm leading-relaxed mb-4">{mention.content}</p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 border-t border-gray-100 pt-3">
          <span>
            <span className="text-gray-500 font-medium">{mention.source?.name ?? `Source #${mention.source_id}`}</span>
          </span>
          {mention.author_handle && <span>{mention.author_handle}</span>}
          <span>{fmtFull(mention.published_at ?? mention.created_at)}</span>
        </div>
      </div>

      {/* Two-column detail */}
      <div className="grid grid-cols-5 gap-4">

        {/* Left — AI analysis + notes */}
        <div className="col-span-3 space-y-4">

          <AiAnalysisPanel mention={mention} />

          {/* Internal Notes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-700">Internal Notes</p>
              <span className="text-[10px] text-gray-400">Never published externally</span>
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={saveNotes}
              rows={4}
              placeholder="Add analyst notes, escalation context, or response decisions…"
              className="w-full text-xs text-gray-700 border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-gray-300"
            />
            {savingNotes && (
              <p className="text-[10px] text-indigo-500 mt-1 flex items-center gap-1">
                <Spinner size="sm" /> Saving…
              </p>
            )}
          </div>
        </div>

        {/* Right — routing + response */}
        <div className="col-span-2 space-y-4">

          {/* Assign & Route */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
            <p className="text-xs font-semibold text-gray-700">Assign &amp; Route</p>

            <div>
              <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wide">Status</label>
              <select
                value={mention.status}
                onChange={handleStatusChange}
                disabled={patching}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-60"
              >
                {STATUSES.map(s => (
                  <option key={s} value={s} className="capitalize">{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wide">Department</label>
              <select
                value={mention.department_id ?? ''}
                onChange={handleDepartmentChange}
                disabled={patching}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-60"
              >
                <option value="">Unassigned</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {currentDept && (
                <p className="text-[10px] text-gray-400 mt-1">
                  Routed to: {currentDept.name}
                </p>
              )}
            </div>
          </div>

          {/* Suggested Response */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Sparkles size={13} className="text-indigo-400" />
              <p className="text-xs font-semibold text-gray-700">Suggested Response</p>
            </div>

            {!response
              ? (
                <button
                  onClick={generateResponse}
                  disabled={generating}
                  className="w-full flex items-center justify-center gap-1.5 text-xs bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2.5 rounded-lg transition disabled:opacity-50"
                >
                  {generating
                    ? <><Spinner size="sm" /> Generating…</>
                    : <><Sparkles size={12} /> Generate AI Response</>
                  }
                </button>
              )
              : (
                <div className="space-y-3">
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                    <p className="text-xs text-indigo-900 leading-relaxed">{response}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={generateResponse}
                      disabled={generating}
                      className="flex-1 text-xs text-indigo-600 border border-indigo-200 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                    >
                      Regenerate
                    </button>
                    <button
                      onClick={() => setResponse(null)}
                      className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg transition"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )
            }
          </div>

        </div>
      </div>

    </div>
  )
}
