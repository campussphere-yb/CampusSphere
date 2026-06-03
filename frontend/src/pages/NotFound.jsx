import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] space-y-4">
      <p className="text-7xl font-bold text-gray-100 select-none">404</p>
      <p className="text-lg font-semibold text-gray-600">Page not found</p>
      <p className="text-sm text-gray-400">The page you're looking for doesn't exist or was moved.</p>
      <Link
        to="/dashboard"
        className="mt-2 flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 hover:underline transition"
      >
        <Home size={14} /> Back to Dashboard
      </Link>
    </div>
  )
}
