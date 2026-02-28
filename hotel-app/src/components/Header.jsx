import { signOut } from '../lib/supabase'
import { useAuth } from '../lib/auth-context'

export default function Header({ hotelName, tabs, activeTab, setActiveTab, extraRight }) {
  const { profile } = useAuth()

  return (
    <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', borderBottom: '1px solid #2a2a3e', padding: '0 28px', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 20, height: 64 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #c9a96e, #a07848)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>⬡</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '0.02em', lineHeight: 1.1 }}>{hotelName || 'HotelOps'}</div>
            {profile && <div className="mono" style={{ fontSize: 10, color: '#888', letterSpacing: '0.1em' }}>{profile.role?.toUpperCase()}</div>}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          {tabs?.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ padding: '7px 16px', borderRadius: 8, fontSize: 14, background: activeTab === t.id ? '#c9a96e22' : 'transparent', color: activeTab === t.id ? '#c9a96e' : '#888', border: activeTab === t.id ? '1px solid #c9a96e44' : '1px solid transparent', letterSpacing: '0.03em' }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {extraRight}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{profile?.full_name}</div>
            <div className="mono" style={{ fontSize: 10, color: '#888' }}>Floor {profile?.floors?.join(', ') || 'All'}</div>
          </div>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #c9a96e, #a07848)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#1a1a2e', fontSize: 14 }}>
            {profile?.avatar_initial || profile?.full_name?.[0] || '?'}
          </div>
          <button onClick={signOut} style={{ padding: '6px 13px', background: '#2a2a3e', borderRadius: 8, color: '#888', fontSize: 12, fontFamily: 'DM Mono, monospace', border: '1px solid #333' }}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
