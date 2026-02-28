import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth-context'
import LoginPage from './pages/LoginPage'
import AdminDashboard from './pages/AdminDashboard'
import EmployeeDashboard from './pages/EmployeeDashboard'

function LoadingScreen() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #c9a96e, #a07848)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>⬡</div>
      <div className="mono" style={{ fontSize: 12, color: '#888', letterSpacing: '0.15em' }}>LOADING...</div>
    </div>
  )
}

export default function App() {
  const { session, profile, loading, isAdmin } = useAuth()

  if (loading) return <LoadingScreen />
  if (!session) return <LoginPage />

  return (
    <Routes>
      <Route path="/" element={isAdmin ? <AdminDashboard /> : <EmployeeDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
