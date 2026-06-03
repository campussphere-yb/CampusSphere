/**
 * TrackingSetup — /tracking
 *
 * Unified configuration page for:
 *   1. Keyword management — add/remove/categorise tracked terms
 *   2. Platform monitoring — toggle sources on/off
 *
 * Backend endpoints called:
 *   GET    /api/v1/tracking/keywords
 *   POST   /api/v1/tracking/keywords
 *   PATCH  /api/v1/tracking/keywords/{id}
 *   DELETE /api/v1/tracking/keywords/{id}
 *   GET    /api/v1/sources
 *   PATCH  /api/v1/sources/{id}   (toggle is_active)
 */

import { useEffect, useState } from 'react'
import { Plus, Trash2, Search, ToggleLeft, ToggleRight, Globe, Tag } from 'lucide-react'
import { trackingApi, sourcesApi } from '../api/client'
import { MOCK_KEYWORDS, MOCK_SOURCES } from '../api/mockData'
import Spinner    from '../components/ui/Spinner'
import MockBanner from '../components/ui/MockBanner'
import { useToast } from '../context/ToastContext'

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORIES   = ['all', 'brand', 'crisis', 'reputation', 'general']
const CAT_COLOURS  = {
  brand:      'bg-indigo-100 text-indigo-700',
  crisis:     'bg-red-100    text-red-700',
  reputation: 'bg-amber-100  text-amber-700',
  general:    'bg-gray-100   text-gray-600',
}

const PLATFORM_ICONS = {
  twitter:   '𝕏',
  reddit:    'R',
  instagram: 'IG',
  news:      '📰',
}

// ── Keywords panel ────────────────────────────────────────────────────────────

function KeywordsPanel({ keywords, setKeywords, usingMock }) {
  const { toast } = useToast()
  const [filter,   setFilter]   = useState('all')
  const [search,   setSearch]   = useState('')
  const [newKw,    setNewKw]    = useState('')
  const [newCat,   setNewCat]   = useState('general')
  const [adding,   setAdding]   = useState(false)
  const [deleting, setDeleting] = useState(null)

  const visible = keywords.filter(k => {
    const matchCat = filter === 'all' || k.category === filter
    const matchQ   = k.keyword.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchQ
  })

  const handleAdd = async e => {
    e.preventDefault()
    if (!newKw.trim()) return
    setAdding(true)
    try {
      if (!usingMock) {
        const res = await trackingApi.createKeyword({ keyword: newKw.trim(), category: newCat })
        setKeywords(ks => [res.data, ...ks])
      } else {
        const fake = { id: Date.now(), keyword: newKw.trim(), category: newCat, is_active: true, created_at: new Date().toISOString() }
        setKeywords(ks => [fake, ...ks])
      }
      toast(`Keyword "${newKw.trim()}" added`)
      setNewKw('')
    } catch {
      toast('Failed to add keyword', 'error')
    } finally {
      setAdding(false)
    }
  }

  const toggleActive = async (kw) => {
    const next = !kw.is_active
    const updated = { ...kw, is_active: next }
    setKeywords(ks => ks.map(k => k.id === kw.id ? updated : k))
    toast(`"${kw.keyword}" ${next ? 'enabled' : 'paused'}`, next ? 'success' : 'info')
    if (!usingMock) {
      try { await trackingApi.updateKeyword(kw.id, { is_active: next }) }
      catch {
        setKeywords(ks => ks.map(k => k.id === kw.id ? kw : k))  // revert
        toast('Failed to update keyword', 'error')
      }
    }
  }

  const handleDelete = async (kw) => {
    setDeleting(kw.id)
    try {
      if (!usingMock) await trackingApi.deleteKeyword(kw.id)
      setKeywords(ks => ks.filter(k => k.id !== kw.id))
      toast(`"${kw.keyword}" removed`, 'info')
    } catch {
      toast('Failed to delete keyword', 'error')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

      {/* Panel header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <Tag size={14} className="text-indigo-500" />
          <h2 className="text-sm font-semibold text-gray-800">Keyword Tracking</h2>
          <span className="ml-auto text-xs text-gray-400">{keywords.filter(k => k.is_active).length} active</span>
        </div>
        <p className="text-xs text-gray-500">Terms monitored across all connected platforms</p>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="px-5 py-3.5 bg-gray-50 border-b border-gray-100 flex gap-2">
        <input
          value={newKw}
          onChange={e => setNewKw(e.target.value)}
          placeholder="Add a keyword or phrase…"
          className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
        />
        <select
          value={newCat}
          onChange={e => setNewCat(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 capitalize"
        >
          {CATEGORIES.filter(c => c !== 'all').map(c => (
            <option key={c} value={c} className="capitalize">{c}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={adding || !newKw.trim()}
          className="flex items-center gap-1 text-xs bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-2 rounded-lg transition disabled:opacity-50 shrink-0"
        >
          {adding ? <Spinner size="sm" /> : <Plus size={13} />} Add
        </button>
      </form>

      {/* Filters */}
      <div className="px-5 py-3 border-b border-gray-100 flex gap-2 flex-wrap">
        {/* Search */}
        <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white flex-1 min-w-[140px]">
          <Search size={11} className="text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search keywords…"
            className="text-xs focus:outline-none flex-1 min-w-0 bg-transparent"
          />
        </div>
        {/* Category chips */}
        <div className="flex gap-1">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`text-[11px] px-2.5 py-1 rounded-lg capitalize transition ${
                filter === c
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-500 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Keyword list */}
      <div className="divide-y divide-gray-50 max-h-[480px] overflow-y-auto">
        {visible.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-10">
            {keywords.length === 0 ? 'No keywords yet — add one above.' : 'No keywords match the current filter.'}
          </p>
        )}
        {visible.map(kw => (
          <div
            key={kw.id}
            className={`flex items-center gap-3 px-5 py-3 transition-colors ${kw.is_active ? '' : 'opacity-50'}`}
          >
            {/* Toggle */}
            <button onClick={() => toggleActive(kw)} className="shrink-0 text-gray-400 hover:text-indigo-600 transition">
              {kw.is_active
                ? <ToggleRight size={20} className="text-indigo-600" />
                : <ToggleLeft  size={20} />
              }
            </button>
            {/* Keyword text */}
            <span className={`flex-1 text-sm ${kw.is_active ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
              {kw.keyword}
            </span>
            {/* Category badge */}
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize shrink-0 ${CAT_COLOURS[kw.category] ?? CAT_COLOURS.general}`}>
              {kw.category}
            </span>
            {/* Delete */}
            <button
              onClick={() => handleDelete(kw)}
              disabled={deleting === kw.id}
              className="text-gray-300 hover:text-red-500 transition shrink-0"
            >
              {deleting === kw.id ? <Spinner size="sm" /> : <Trash2 size={13} />}
            </button>
          </div>
        ))}
      </div>

      {/* Footer count */}
      <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50">
        <p className="text-[10px] text-gray-400">
          {visible.length} of {keywords.length} keywords shown · {keywords.filter(k => k.is_active).length} active
        </p>
      </div>
    </div>
  )
}

// ── Platform monitoring panel ─────────────────────────────────────────────────

function PlatformCard({ source, onToggle }) {
  const [toggling, setToggling] = useState(false)

  const handleToggle = async () => {
    setToggling(true)
    await onToggle(source)
    setToggling(false)
  }

  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
      source.is_active
        ? 'bg-white border-indigo-100 shadow-sm'
        : 'bg-gray-50 border-gray-100 opacity-60'
    }`}>
      {/* Platform icon */}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
        source.is_active ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'
      }`}>
        {PLATFORM_ICONS[source.platform_key] ?? '•'}
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{source.name}</p>
        <p className="text-[10px] text-gray-400 capitalize">{source.platform_key}</p>
      </div>
      {/* Toggle */}
      <button
        onClick={handleToggle}
        disabled={toggling}
        className="shrink-0 flex items-center gap-1.5 text-xs transition"
      >
        {toggling
          ? <Spinner size="sm" />
          : source.is_active
            ? <ToggleRight size={22} className="text-indigo-600" />
            : <ToggleLeft  size={22} className="text-gray-400" />
        }
      </button>
    </div>
  )
}

function PlatformPanel({ sources, setSources, usingMock }) {
  const { toast } = useToast()

  const handleToggle = async (source) => {
    const active = !source.is_active
    const next = { ...source, is_active: active }
    setSources(ss => ss.map(s => s.id === source.id ? next : s))
    toast(`${source.name} ${active ? 'enabled' : 'disabled'}`, active ? 'success' : 'info')
    if (!usingMock) {
      try { await sourcesApi.update(source.id, { is_active: active }) }
      catch {
        setSources(ss => ss.map(s => s.id === source.id ? source : s))  // revert
        toast('Failed to update platform', 'error')
      }
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <Globe size={14} className="text-indigo-500" />
          <h2 className="text-sm font-semibold text-gray-800">Platform Monitoring</h2>
        </div>
        <p className="text-xs text-gray-500">Toggle which platforms are actively monitored</p>
      </div>
      <div className="p-4 space-y-3">
        {sources.map(s => (
          <PlatformCard key={s.id} source={s} onToggle={handleToggle} />
        ))}
        {sources.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-6">No sources configured yet.</p>
        )}
      </div>
      <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50">
        <p className="text-[10px] text-gray-400">
          {sources.filter(s => s.is_active).length} of {sources.length} platforms active
        </p>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TrackingSetup() {
  const [keywords,  setKeywords]  = useState([])
  const [sources,   setSources]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [usingMock, setUsingMock] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const [kwRes, srRes] = await Promise.all([
          trackingApi.listKeywords(),
          sourcesApi.list(),
        ])
        const hasMock = kwRes.data.length === 0
        setUsingMock(hasMock)
        setKeywords(hasMock ? MOCK_KEYWORDS : kwRes.data)
        setSources(srRes.data.length > 0 ? srRes.data : MOCK_SOURCES)
      } catch {
        setUsingMock(true)
        setKeywords(MOCK_KEYWORDS)
        setSources(MOCK_SOURCES)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className="p-6 max-w-6xl space-y-5">

      <div>
        <h1 className="text-xl font-bold text-gray-900">Tracking Setup</h1>
        <p className="text-sm text-gray-500">Manage keywords and platform monitoring configuration</p>
      </div>

      {usingMock && <MockBanner />}

      {loading
        ? <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        : (
          <div className="grid grid-cols-5 gap-5">
            {/* Keywords — 3/5 */}
            <div className="col-span-3">
              <KeywordsPanel
                keywords={keywords}
                setKeywords={setKeywords}
                usingMock={usingMock}
              />
            </div>
            {/* Platform toggles — 2/5 */}
            <div className="col-span-2">
              <PlatformPanel
                sources={sources}
                setSources={setSources}
                usingMock={usingMock}
              />
            </div>
          </div>
        )
      }
    </div>
  )
}
