/**
 * Connectors — calls these backend endpoints:
 *   GET  /api/v1/connectors
 *   POST /api/v1/connectors/{id}/sync
 *   POST /api/v1/connectors          (create — basic form)
 *
 * Credential refs are hidden by default and revealed via a toggle.
 */

import { useEffect, useState } from 'react'
import { RefreshCw, Plus, Plug, Eye, EyeOff } from 'lucide-react'
import { connectorsApi, sourcesApi } from '../api/client'
import { MOCK_CONNECTORS, MOCK_SOURCES } from '../api/mockData'
import Badge      from '../components/ui/Badge'
import Spinner    from '../components/ui/Spinner'
import MockBanner from '../components/ui/MockBanner'
import { useToast } from '../context/ToastContext'

function fmtTime(iso) {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

const BLANK = { name: '', source_id: '', credential_store: 'mock', credential_ref: '' }

export default function Connectors() {
  const { toast } = useToast()
  const [connectors, setConnectors] = useState([])
  const [sources,    setSources]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [usingMock,  setUsingMock]  = useState(false)
  const [syncing,    setSyncing]    = useState(null)
  const [showForm,   setShowForm]   = useState(false)
  const [form,       setForm]       = useState(BLANK)
  const [saving,     setSaving]     = useState(false)
  const [revealedId, setRevealedId] = useState(null)  // which connector's cred is revealed

  const load = async () => {
    setLoading(true)
    try {
      const [cRes, sRes] = await Promise.all([connectorsApi.list(), sourcesApi.list()])
      if (cRes.data.length === 0) {
        setUsingMock(true)
        setConnectors(MOCK_CONNECTORS)
        setSources(sRes.data.length > 0 ? sRes.data : MOCK_SOURCES)
      } else {
        setUsingMock(false)
        setConnectors(cRes.data)
        setSources(sRes.data)
      }
    } catch {
      setUsingMock(true)
      setConnectors(MOCK_CONNECTORS)
      setSources(MOCK_SOURCES)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const triggerSync = async (id) => {
    setSyncing(id)
    try {
      if (usingMock) {
        await new Promise(r => setTimeout(r, 800))
        const now = new Date().toISOString()
        setConnectors(cs => cs.map(c => c.id === id ? { ...c, last_synced_at: now } : c))
      } else {
        const res = await connectorsApi.sync(id)
        setConnectors(cs => cs.map(c => c.id === id ? res.data : c))
      }
      toast('Sync triggered successfully')
    } catch {
      toast('Sync failed', 'error')
    } finally {
      setSyncing(null)
    }
  }

  const handleCreate = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, source_id: parseInt(form.source_id) }
      if (!usingMock) {
        const res = await connectorsApi.create(payload)
        setConnectors(cs => [...cs, res.data])
      } else {
        const fake = { ...payload, id: Date.now(), status: 'active', last_synced_at: null, created_at: new Date().toISOString() }
        setConnectors(cs => [...cs, fake])
      }
      setForm(BLANK)
      setShowForm(false)
      toast('Connector created')
    } catch {
      toast('Failed to create connector', 'error')
    } finally {
      setSaving(false)
    }
  }

  const sourceName = id => sources.find(s => s.id === id)?.name ?? `Source #${id}`

  return (
    <div className="p-6 max-w-5xl space-y-5">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Connectors</h1>
          <p className="text-sm text-gray-500">Configured integrations that pull mentions from sources</p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-1.5 text-xs bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-2 rounded-lg transition"
        >
          <Plus size={13} /> Add Connector
        </button>
      </div>

      {usingMock && <MockBanner />}

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">New Connector</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name</label>
              <input
                required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Twitter/X Monitor"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Source</label>
              <select
                required value={form.source_id} onChange={e => setForm(f => ({...f, source_id: e.target.value}))}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">Select source…</option>
                {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Credential Store</label>
              <select
                value={form.credential_store} onChange={e => setForm(f => ({...f, credential_store: e.target.value}))}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="mock">mock (dev placeholder)</option>
                <option value="env_var">env_var</option>
                <option value="secrets_manager">secrets_manager</option>
                <option value="vault">vault</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Credential Ref</label>
              <input
                value={form.credential_ref} onChange={e => setForm(f => ({...f, credential_ref: e.target.value}))}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="mock://twitter-dev or ENV_VAR_NAME"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="flex items-center gap-1.5 text-xs bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-lg transition disabled:opacity-50">
              {saving ? <Spinner size="sm" /> : <Plus size={12} />} Create
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="text-xs text-gray-500 hover:text-gray-700 px-4 py-2 border border-gray-200 rounded-lg">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading
        ? <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        : connectors.length === 0
          ? (
            <div className="text-center py-16">
              <Plug size={36} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No connectors configured</p>
              <p className="text-gray-400 text-sm mt-1">Add a connector to start ingesting mentions.</p>
            </div>
          )
          : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-left text-[10px] text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Credentials</th>
                    <th className="px-4 py-3 font-medium">Last Synced</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {connectors.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                      <td className="px-4 py-3 text-gray-500">{sourceName(c.source_id)}</td>
                      <td className="px-4 py-3"><Badge value={c.status} /></td>
                      {/* Credentials — hidden by default */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-gray-400 text-[10px]">{c.credential_store}</span>
                          {c.credential_ref && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-gray-400 font-mono max-w-[120px] truncate">
                                {revealedId === c.id ? c.credential_ref : '••••••••'}
                              </span>
                              <button
                                onClick={() => setRevealedId(revealedId === c.id ? null : c.id)}
                                className="text-gray-400 hover:text-gray-600 transition"
                                title={revealedId === c.id ? 'Hide' : 'Show credential ref'}
                              >
                                {revealedId === c.id
                                  ? <EyeOff size={11} />
                                  : <Eye size={11} />
                                }
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmtTime(c.last_synced_at)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => triggerSync(c.id)}
                          disabled={syncing === c.id || c.status === 'error'}
                          className="flex items-center gap-1 text-[11px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition disabled:opacity-40"
                        >
                          {syncing === c.id ? <Spinner size="sm" /> : <RefreshCw size={11} />}
                          Sync
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      }
    </div>
  )
}
