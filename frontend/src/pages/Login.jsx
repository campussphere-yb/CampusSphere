/**
 * Login — /login
 *
 * Authentication entry point for CampusSphere Enterprise.
 * For this dev build, authentication is mocked via localStorage.
 * In production, replace handleSubmit with a real API call to POST /auth/login.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import Spinner from '../components/ui/Spinner'

export default function Login() {
  const navigate = useNavigate()
  const [name,      setName]      = useState('')
  const [role,      setRole]      = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }
    setLoading(true)
    // Simulate network latency for realism
    await new Promise(r => setTimeout(r, 750))

    // Derive display name from email if not provided
    const displayName = name.trim() ||
      email.split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())

    // Mock auth: any credentials work in dev
    localStorage.setItem('cs_authenticated', '1')
    localStorage.setItem('cs_user', JSON.stringify({
      name:  displayName,
      role:  role.trim() || 'VP Communications',
      email: email,
    }))
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex items-center justify-center p-4">

      {/* Decorative background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-500 rounded-2xl shadow-2xl shadow-indigo-900/50 mb-4">
            <span className="text-white text-xl font-bold">CS</span>
          </div>
          <h1 className="text-2xl font-bold text-white">CampusSphere</h1>
          <p className="text-indigo-300 text-sm font-medium tracking-wider uppercase mt-0.5">Enterprise</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">Sign in to your account</h2>
            <p className="text-slate-400 text-sm mt-1">Monitor mentions and manage institutional risk</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Name + Role row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Your name <span className="text-slate-500 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Yves Bruno"
                  className="w-full text-sm bg-white/10 border border-white/10 text-white placeholder:text-slate-500 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Role <span className="text-slate-500 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  placeholder="e.g. Functional Analyst III"
                  className="w-full text-sm bg-white/10 border border-white/10 text-white placeholder:text-slate-500 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@bu.edu"
                autoComplete="email"
                className="w-full text-sm bg-white/10 border border-white/10 text-white placeholder:text-slate-500 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full text-sm bg-white/10 border border-white/10 text-white placeholder:text-slate-500 rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg py-2.5 transition disabled:opacity-60 mt-2"
            >
              {loading
                ? <><Spinner size="sm" /> Signing in…</>
                : 'Sign in'
              }
            </button>
          </form>

          {/* Demo note */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <div className="flex items-start gap-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-2.5">
              <Sparkles size={13} className="text-indigo-400 mt-0.5 shrink-0" />
              <p className="text-xs text-indigo-300 leading-relaxed">
                <span className="font-medium text-indigo-200">Demo mode</span> — any email and password will work.
                Name and role are stored locally and shown in the sidebar.
              </p>
            </div>
          </div>
        </div>

        {/* Footer trust badges */}
        <div className="flex items-center justify-center gap-4 mt-6 text-slate-600 text-xs">
          <span className="flex items-center gap-1">
            <ShieldCheck size={11} /> SOC 2 Ready
          </span>
          <span>·</span>
          <span>256-bit encryption</span>
          <span>·</span>
          <span>FERPA compliant</span>
        </div>
      </div>
    </div>
  )
}
