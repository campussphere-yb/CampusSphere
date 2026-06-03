/**
 * Sources — platform types monitored by CampusSphere.
 *
 * Calls:
 *   GET   /api/v1/sources
 *   POST  /api/v1/sources
 *   PATCH /api/v1/sources/{id}  (toggle is_active, update name/url)
 */

import { useEffect, useState } from 'react'
import { Globe, Plus, ToggleLeft, ToggleRight, ExternalLink } from 'lucide-react'
import { sourcesApi } from '../api/client'
import { MOCK_SOURCES } from '../api/mockData'
import Spinner    from '../components/ui/Spinner'
import MockBanner from '../components/ui/MockBanner'
import { useToast } from '../context/ToastContext'

const BLANK = { name: '', platform_key: '', base_url: '' }

const PLATFORM_ICONS = {
  twitter:   { glyph: '𝕏',   bg: 'bg-slate-800', text: 'text-white' },
  reddit:    { glyph: 'R',    bg: 'bg-orange-500',text: 'text-white' },
  instagram: { glyph: 'IG',   bg: 'bg-pink-500',  text: 'text-white' },
  news:      { glyph: '📰',   bg: 'bg-blue-500',  text: 'text-white' },
}

function PlatformIcon({ platformKey }) {
  const p = PLATFORM_ICONS[platformKey]
  if (!p) return (
    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
      <Globe size={16} className="text-gray-400" />
    </div>
  )
  return (
    <div className={`w-10 h-10 rounded-xl ${p.bg} flex items-center justify-center shrink-0 text-sm font-bold ${p.text}`}>
      {p.glyph}
    </div>
  )
}

export default function Sources() {
  const { toast } = useToast()
  const [sources,   setSources]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [usingMock, setUsingMock] = useState(false)
  const [showForm,  setShowForm]  = useState(false)
  const [form,      setForm]      = useState(BLANK)
  const [saving,    setSaving]    = useState(false)
  const [toggling,  setToggling]  = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await sourcesApi.list()
      if (res.data.length === 0) { setUsingMock(true); setSources(MOCK_SOURCES) }
      else                       { setUsingMock(false); setSources(res.data) }
    } catch {
      setUsingMock(true); setSources(MOCK_SOURCES)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const toggleActive = async (s) => {
    setToggling(s.id)
    const next = !s.is_active
    try {
      if (usingMock) {
        setSources(ss => ss.map(x => x.id === s.id ? { ...x, is_active: next } : x))
      } else {
        const res = await sourcesApi.update(s.id, { is_active: next })
        setSources(ss => ss.map(x => x.id === s.id ? res.data : x))
      }
      toast(`${s.name} ${next ? 'enabled' : 'disabled'}`, next ? 'success' : 'info')
    } catch {
      toast('Failed to update source', 'error')
    } finally {
      setToggling(null)
    }
  }

  const handleCreate = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, is_active: true }
      if (!usingMock) {
        const res = await sourcesApi.create(payload)
        setSources(ss => [...ss, res.data])
      } else {
        setSources(ss => [...ss, { ...payload, id: Date.now(), created_at: new Date().toISOString() }])
      }
      setForm(BLANK); setShowForm(false)
      toast(`Source "${form.name}" added`)
    } catch {
      toast('Failed to create source', 'error')
    } finally {
      setSaving(false)
    }
  }

  const active   = sources.filter(s => s.is_active).length
  const inactive = sources.length - active

  return (
    <div className="p-6 max-w-4xl space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Sources</h1>
          <p className="text-sm text-gray-500">
            Platform types being monitored ·{' '}
            <span className="text-green-600 font-medium">{active} active</span>
            {inactive > 0 && <span className="text-gray-400">, {inactive} paused</span>}
          </p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-1.5 text-xs bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-2 rounded-lg transition"
        >
          <Plus size={13} /> Add Source
        </button>
      </div>

      {usingMock && <MockBanner />}

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">New Source</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Display Name</label>
              <input
                required value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Twitter / X"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Platform Key</label>
              <input
                required value={form.platform_key}
                onChange={e => setForm(f => ({ ...f, platform_key: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="twitter"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Base URL <span className="text-gray-300">(optional)</span></label>
              <input
                value={form.base_url}
                onChange={e => setForm(f => ({ ...f, base_url: e.target.value }))}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="https://twitter.com"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit" disabled={saving}
              className="flex items-center gap-1.5 text-xs bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              {saving ? <Spinner size="sm" /> : <Plus size={12} />} Create
            </button>
            <button
              type="button" onClick={() => setShowForm(false)}
              className="text-xs text-gray-500 hover:text-gray-700 px-4 py-2 border border-gray-200 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Sources grid */}
      {loading
        ? <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        : sources.length === 0
          ? (
            <div className="text-center py-16">
              <Globe size={36} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No sources registered</p>
              <p className="text-gray-400 text-sm mt-1">Add a source to start configuring connectors.</p>
            </div>
          )
          : (
            <div className="grid grid-cols-2 gap-3">
              {sources.map(s => (
                <div
                  key={s.id}
                  className={`bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4 transition-all ${
                    s.is_active
                      ? 'border-gray-100 hover:border-indigo-100 hover:shadow-md'
                      : 'border-gray-100 opacity-60'
                  }`}
                >
                  {/* Icon */}
                  <PlatformIcon platformKey={s.platform_key} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                        s.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {s.is_active ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 font-mono mt-0.5">{s.platform_key}</p>
                    {s.base_url && (
                      <a
                        href={s.base_url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-0.5 text-[11px] text-indigo-500 hover:underline mt-0.5"
                      >
                        {s.base_url.replace(/^https?:\/\//, '')}
                        <ExternalLink size={9} />
                      </a>
                    )}
                  </div>

                  {/* Toggle */}
                  <button
                    onClick={() => toggleActive(s)}
                    disabled={toggling === s.id}
                    className="shrink-0 transition"
                    title={s.is_active ? 'Disable monitoring' : 'Enable monitoring'}
                  >
                    {toggling === s.id
                      ? <Spinner size="sm" />
                      : s.is_active
                        ? <ToggleRight size={24} className="text-indigo-600" />
                        : <ToggleLeft  size={24} className="text-gray-300" />
                    }
                  </button>
                </div>
              ))}
            </div>
          )
      }
    </div>
  )
}
