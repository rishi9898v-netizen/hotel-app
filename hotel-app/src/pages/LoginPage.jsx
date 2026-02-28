import { useState } from 'react'
import { signIn } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await signIn(email, password)
    if (error) { setError(error.message); setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse at 30% 50%, #16213e 0%, #0d0d14 70%)' }}>
      <style>{`
        .login-card { background: #1a1a2e; border: 1px solid #2a2a3e; border-radius: 20px; padding: 48px 44px; width: 400px; }
        .login-input { background: #0d0d14 !important; border: 1px solid #333 !important; }
        .login-input:focus { border-color: #c9a96e !important; }
      `}</style>
      <div className="login-card fade-in">
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 52, height: 52, background: 'linear-gradient(135deg, #c9a96e, #a07848)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 16px' }}>⬡</div>
          <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '0.02em' }}>HotelOps</div>
          <div className="mono" style={{ fontSize: 11, color: '#888', letterSpacing: '0.12em', marginTop: 4 }}>ROOM MANAGEMENT SYSTEM</div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <div className="label" style={{ marginBottom: 7 }}>Email</div>
            <input className="login-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required />
          </div>
          <div style={{ marginBottom: 24 }}>
            <div className="label" style={{ marginBottom: 7 }}>Password</div>
            <input className="login-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>

          {error && (
            <div style={{ background: '#3d1a1a', border: '1px solid #6b2222', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#ff8080', fontFamily: 'DM Mono, monospace' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{ width: '100%', padding: '13px', background: loading ? '#555' : 'linear-gradient(135deg, #c9a96e, #a07848)', borderRadius: 12, color: '#1a1a2e', fontSize: 16, fontWeight: 600, letterSpacing: '0.03em' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 24, padding: '16px', background: '#0d0d14', borderRadius: 10, border: '1px solid #2a2a3e' }}>
          <div className="label" style={{ marginBottom: 8 }}>Quick start test credentials</div>
          <div style={{ fontSize: 12, color: '#888', fontFamily: 'DM Mono, monospace', lineHeight: 1.8 }}>
            Admin: admin@hotel.com / Admin1234!<br />
            Staff: staff@hotel.com / Staff1234!
          </div>
        </div>
      </div>
    </div>
  )
}
