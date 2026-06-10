/**
 * Departments — /departments
 *
 * CRUD management for routing departments.
 * Departments are used to assign/route mentions for internal triage.
 *
 * Backend endpoints used:
 *   GET    /api/v1/departments/
 *   POST   /api/v1/departments/
 *   PATCH  /api/v1/departments/{id}
 *   DELETE /api/v1/departments/{id}
 *   GET    /api/v1/departments/{id}/mentions  (for mention count badge)
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2, Plus, Pencil, Trash2, Check, X,
  Mail, MessageSquare, ChevronRight,
} from 'lucide-react'
import { departmentsApi } from '../api/client'
import Spinner from '../components/ui/Spinner'
import { useToast } from '../context/ToastContext'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const EMPTY_FORM = { name: '', description: '', contact_email: '' }

// ── Add / Edit form (shared) ──────────────────────────────────────────────────
function DeptForm({ initial = EMPTY_FORM, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    onSave(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1">
          Department Name <span className="text-red-400">*</span>
        </label>
        <input
          autoFocus
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="e.g. Student Affairs"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          required
        />
      </div>
      <div>
        <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1">Description</label>
        <input
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Optional — what this department handles"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>
      <div>
        <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1">Contact Email</label>
        <input
          type="email"
          value={form.contact_email}
          onChange={e => set('contact_email', e.target.value)}
          placeholder="dept@university.edu"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving || !form.name.trim()}
          className="flex items-center gap-1.5 text-xs bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-lg transition disabled:opacity-50"
        >
          {saving ? <Spinner size="sm" /> : <Check size={13} />}
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 px-4 py-2 rounded-lg transition"
        >
          <X size={13} /> Cancel
        </button>
      </div>
    </form>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Departments() {
  const { toast } = useToast()
  const [depts,       setDepts]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showAdd,     setShowAdd]     = useState(false)
  const [editId,      setEditId]      = useState(null)   // dept id being edited
  const [deleteId,    setDeleteId]    = useState(null)   // dept id awaiting confirm
  const [saving,      setSaving]      = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [mentionCounts, setMentionCounts] = useState({}) // { deptId: count }

  // ── Load departments ────────────────────────────────────────────────────────
  const loadDepts = async () => {
    try {
      const res = await departmentsApi.list()
      setDepts(res.data)
      // Fetch mention counts for each dept in parallel (best-effort)
      const counts = {}
      await Promise.allSettled(
        res.data.map(async d => {
          try {
            const r = await departmentsApi.mentions(d.id)
            counts[d.id] = r.data.length
          } catch { counts[d.id] = 0 }
        })
      )
      setMentionCounts(counts)
    } catch {
      toast('Failed to load departments', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadDepts() }, [])

  // ── Create ──────────────────────────────────────────────────────────────────
  const handleCreate = async (form) => {
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        ...(form.description.trim()    && { description:    form.description.trim()    }),
        ...(form.contact_email.trim()  && { contact_email:  form.contact_email.trim()  }),
      }
      const res = await departmentsApi.create(payload)
      setDepts(d => [...d, res.data])
      setMentionCounts(c => ({ ...c, [res.data.id]: 0 }))
      setShowAdd(false)
      toast('Department created')
    } catch (err) {
      toast(err?.response?.data?.detail || 'Failed to create department', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  const handleUpdate = async (id, form) => {
    setSaving(true)
    try {
      const payload = {
        name:          form.name.trim()          || undefined,
        description:   form.description.trim()   || null,
        contact_email: form.contact_email.trim() || null,
      }
      const res = await departmentsApi.update(id, payload)
      setDepts(d => d.map(x => x.id === id ? res.data : x))
      setEditId(null)
      toast('Department updated')
    } catch (err) {
      toast(err?.response?.data?.detail || 'Failed to update department', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    setDeleting(true)
    try {
      await departmentsApi.remove(id)
      setDepts(d => d.filter(x => x.id !== id))
      setDeleteId(null)
      toast('Department deleted')
    } catch {
      toast('Failed to delete department', 'error')
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-4xl space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Departments</h1>
          <p className="text-sm text-gray-500">
            Manage routing departments for mention triage and escalation.
          </p>
        </div>
        {!showAdd && (
          <button
            onClick={() => { setShowAdd(true); setEditId(null) }}
            className="flex items-center gap-1.5 text-xs bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-lg transition"
          >
            <Plus size={13} /> Add Department
          </button>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-xl shadow-sm border border-indigo-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={14} className="text-indigo-500" />
            <h2 className="text-sm font-semibold text-gray-800">New Department</h2>
          </div>
          <DeptForm
            onSave={handleCreate}
            onCancel={() => setShowAdd(false)}
            saving={saving}
          />
        </div>
      )}

      {/* Department list */}
      {loading
        ? <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        : depts.length === 0 && !showAdd
          ? (
            <div className="text-center py-20 text-gray-400 space-y-2">
              <Building2 size={32} className="mx-auto opacity-30" />
              <p className="text-sm">No departments yet.</p>
              <button
                onClick={() => setShowAdd(true)}
                className="text-xs text-indigo-500 hover:underline"
              >
                Add your first department
              </button>
            </div>
          )
          : (
            <div className="space-y-3">
              {depts.map(dept => {
                const isEditing  = editId  === dept.id
                const isDeleting = deleteId === dept.id
                const mCount     = mentionCounts[dept.id] ?? '…'

                return (
                  <div
                    key={dept.id}
                    className={`bg-white rounded-xl shadow-sm border transition ${
                      isEditing ? 'border-indigo-200' : 'border-gray-100'
                    }`}
                  >
                    {isEditing
                      ? (
                        /* ── Edit mode ── */
                        <div className="p-5">
                          <div className="flex items-center gap-2 mb-4">
                            <Pencil size={13} className="text-indigo-400" />
                            <span className="text-sm font-semibold text-gray-700">Edit Department</span>
                          </div>
                          <DeptForm
                            initial={{
                              name:          dept.name          ?? '',
                              description:   dept.description   ?? '',
                              contact_email: dept.contact_email ?? '',
                            }}
                            onSave={form => handleUpdate(dept.id, form)}
                            onCancel={() => setEditId(null)}
                            saving={saving}
                          />
                        </div>
                      )
                      : (
                        /* ── View mode ── */
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            {/* Left — info */}
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                                <Building2 size={14} className="text-indigo-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-800">{dept.name}</p>
                                {dept.description && (
                                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{dept.description}</p>
                                )}
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                                  {dept.contact_email && (
                                    <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                      <Mail size={10} />
                                      {dept.contact_email}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                    <MessageSquare size={10} />
                                    {mCount} mention{mCount !== 1 ? 's' : ''} assigned
                                  </span>
                                  <span className="text-[11px] text-gray-300">
                                    Added {fmtDate(dept.created_at)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Right — actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              <Link
                                to={`/mentions?status=&department_id=${dept.id}`}
                                title="View assigned mentions"
                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              >
                                <ChevronRight size={14} />
                              </Link>
                              <button
                                onClick={() => { setEditId(dept.id); setShowAdd(false); setDeleteId(null) }}
                                title="Edit"
                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => setDeleteId(isDeleting ? null : dept.id)}
                                title="Delete"
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Delete confirmation inline */}
                          {isDeleting && (
                            <div className="mt-3 pt-3 border-t border-red-100 flex items-center justify-between">
                              <p className="text-xs text-red-600">
                                Delete <span className="font-semibold">{dept.name}</span>?
                                {(mentionCounts[dept.id] ?? 0) > 0 && (
                                  <span className="text-gray-400 ml-1">
                                    ({mentionCounts[dept.id]} mention{mentionCounts[dept.id] !== 1 ? 's' : ''} will be unassigned.)
                                  </span>
                                )}
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleDelete(dept.id)}
                                  disabled={deleting}
                                  className="flex items-center gap-1 text-xs bg-red-600 text-white hover:bg-red-700 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                                >
                                  {deleting ? <Spinner size="sm" /> : <Trash2 size={11} />}
                                  Delete
                                </button>
                                <button
                                  onClick={() => setDeleteId(null)}
                                  className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg transition"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    }
                  </div>
                )
              })}
            </div>
          )
      }
    </div>
  )
}
