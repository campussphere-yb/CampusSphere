import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, MessageSquare, Bell,
  Plug, Globe, Sparkles, SlidersHorizontal, LogOut,
} from 'lucide-react'
import { dashboardApi } from '../../api/client'
import { MOCK_COUNTS } from '../../api/mockData'

// ── Navigation structure ──────────────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard',  Icon: LayoutDashboard, label: 'Dashboard'       },
      { to: '/summaries',  Icon: Sparkles,        label: 'AI Summaries'    },
    ],
  },
  {
    label: 'Monitor',
    items: [
      { to: '/mentions',   Icon: MessageSquare, label: 'Mentions Inbox', badge: 'mentions' },
      { to: '/alerts',     Icon: Bell,          label: 'Risk Alerts',    badge: 'alerts'   },
    ],
  },
  {
    label: 'Data Sources',
    items: [
      { to: '/connectors', Icon: Plug,                label: 'Connectors'     },
      { to: '/sources',    Icon: Globe,               label: 'Sources'        },
      { to: '/tracking',   Icon: SlidersHorizontal,   label: 'Tracking Setup' },
    ],
  },
]

// ── Platform icon colours ─────────────────────────────────────────────────────
function NavItem({ to, Icon, label, badge, counts }) {
  const count = badge === 'mentions' ? counts?.new_mentions : badge === 'alerts' ? counts?.open_alerts : 0
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive
            ? 'bg-indigo-600 text-white'
            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
        }`
      }
    >
      <Icon size={15} strokeWidth={2} className="shrink-0" />
      <span className="flex-1">{label}</span>
      {count > 0 && (
        <span className="flex items-center gap-1 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 h-[18px]">
          {count > 99 ? '99+' : count}
          {badge === 'mentions' && <span className="font-normal opacity-90">new</span>}
        </span>
      )}
    </NavLink>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const navigate = useNavigate()
  const [counts, setCounts] = useState(null)

  const signOut = () => {
    localStorage.removeItem('cs_authenticated')
    localStorage.removeItem('cs_user')
    navigate('/login', { replace: true })
  }

  // Read stored user (falls back to default)
  const stored = (() => {
    try { return JSON.parse(localStorage.getItem('cs_user') || '{}') } catch { return {} }
  })()
  const userName = stored.name  || stored.email?.split('@')[0] || 'CampusSphere User'
  const userRole = stored.role  || 'Functional Analyst III'
  const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  useEffect(() => {
    const fetchCounts = () =>
      dashboardApi.getCounts()
        .then(r => {
          const data = r.data
          // Fall back to mock when DB has no real mentions yet (both counts are 0)
          setCounts((!data.new_mentions && !data.open_alerts) ? MOCK_COUNTS : data)
        })
        .catch(() => setCounts(MOCK_COUNTS))

    fetchCounts()                                       // immediate on mount
    const id = setInterval(fetchCounts, 30_000)         // re-poll every 30 s
    return () => clearInterval(id)
  }, [])

  return (
    <aside className="w-60 bg-slate-900 min-h-screen flex flex-col shrink-0">

      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-indigo-900/40">
            <span className="text-white text-xs font-bold tracking-wide">CS</span>
          </div>
          <div>
            <span className="text-white font-semibold text-sm leading-tight block">CampusSphere</span>
            <span className="text-indigo-400 text-[10px] font-medium tracking-wider uppercase">Enterprise</span>
          </div>
        </div>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map(item => (
                <NavItem key={item.to} {...item} counts={counts} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User profile */}
      <div className="px-4 py-3.5 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-semibold">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-slate-200 text-xs font-medium truncate">{userName}</p>
            <p className="text-slate-500 text-[10px] truncate">{userRole}</p>
          </div>
          <button
            onClick={signOut}
            title="Sign out"
            className="text-slate-600 hover:text-slate-300 transition shrink-0"
          >
            <LogOut size={14} />
          </button>
        </div>
        <p className="text-slate-700 text-[10px] mt-2.5">v0.1.0 · dev</p>
      </div>

    </aside>
  )
}
