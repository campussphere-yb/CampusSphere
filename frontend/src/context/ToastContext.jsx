/**
 * ToastContext — lightweight app-wide notification system.
 *
 * Usage:
 *   const { toast } = useToast()
 *   toast('Keyword added')               // success (default)
 *   toast('Failed to save', 'error')
 *   toast('Note saved', 'info')
 *   toast('Review required', 'warning')
 */

import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastContext = createContext(null)

let nextId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const remove = useCallback((id) => {
    setToasts(ts => ts.filter(t => t.id !== id))
    clearTimeout(timers.current[id])
    delete timers.current[id]
  }, [])

  const toast = useCallback((message, type = 'success', duration = 3500) => {
    const id = nextId++
    setToasts(ts => [...ts, { id, message, type }])
    timers.current[id] = setTimeout(() => remove(id), duration)
    return id
  }, [remove])

  return (
    <ToastContext.Provider value={{ toast, remove }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

// ── Toast UI ──────────────────────────────────────────────────────────────────

const STYLES = {
  success: {
    wrap:  'bg-white border-l-4 border-green-500 shadow-lg',
    icon:  '✓',
    ico_c: 'text-green-500',
    msg_c: 'text-gray-800',
  },
  error: {
    wrap:  'bg-white border-l-4 border-red-500 shadow-lg',
    icon:  '✕',
    ico_c: 'text-red-500',
    msg_c: 'text-gray-800',
  },
  warning: {
    wrap:  'bg-white border-l-4 border-amber-400 shadow-lg',
    icon:  '!',
    ico_c: 'text-amber-500 font-bold',
    msg_c: 'text-gray-800',
  },
  info: {
    wrap:  'bg-white border-l-4 border-blue-500 shadow-lg',
    icon:  'i',
    ico_c: 'text-blue-500 font-bold italic',
    msg_c: 'text-gray-800',
  },
}

function ToastItem({ toast, onRemove }) {
  const s = STYLES[toast.type] ?? STYLES.info
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg min-w-[260px] max-w-[360px] ${s.wrap}`}>
      <span className={`text-sm shrink-0 mt-0.5 w-4 text-center ${s.ico_c}`}>{s.icon}</span>
      <p className={`text-sm flex-1 leading-snug ${s.msg_c}`}>{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-gray-300 hover:text-gray-500 transition text-xs shrink-0 mt-0.5"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}

function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto animate-fade-in-up">
          <ToastItem toast={t} onRemove={onRemove} />
        </div>
      ))}
    </div>
  )
}
