import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout      from './components/layout/AppLayout'
import Dashboard      from './pages/Dashboard'
import Mentions       from './pages/Mentions'
import MentionDetail  from './pages/MentionDetail'
import Alerts         from './pages/Alerts'
import Connectors     from './pages/Connectors'
import Sources        from './pages/Sources'
import Summaries      from './pages/Summaries'
import TrackingSetup  from './pages/TrackingSetup'
import Departments    from './pages/Departments'
import Login          from './pages/Login'
import NotFound       from './pages/NotFound'

// Redirect to /login if not authenticated; otherwise render children
function RequireAuth({ children }) {
  return localStorage.getItem('cs_authenticated')
    ? children
    : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Protected */}
      <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index                     element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"          element={<Dashboard />} />
        <Route path="mentions"           element={<Mentions />} />
        <Route path="mentions/:id"       element={<MentionDetail />} />
        <Route path="alerts"             element={<Alerts />} />
        <Route path="connectors"         element={<Connectors />} />
        <Route path="sources"            element={<Sources />} />
        <Route path="summaries"          element={<Summaries />} />
        <Route path="tracking"           element={<TrackingSetup />} />
        <Route path="departments"        element={<Departments />} />
        <Route path="*"                  element={<NotFound />} />
      </Route>
    </Routes>
  )
}
