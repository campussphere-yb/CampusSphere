import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { ToastProvider } from '../../context/ToastContext'

export default function AppLayout() {
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </ToastProvider>
  )
}
