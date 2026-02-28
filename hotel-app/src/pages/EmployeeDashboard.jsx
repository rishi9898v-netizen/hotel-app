import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth-context'
import { getRooms, updateRoom, createMaintenanceTicket, logActivity, supabase } from '../lib/supabase'
import { STATUS_FLOW, getStatusDef, timeAgo } from '../lib/constants'
import Header from '../components/Header'
import Toast from '../components/Toast'
import RoomPanel from '../components/RoomPanel'

const TABS = [
  { id: 'my_rooms', label: 'My Rooms', icon: '🧹' },
  { id: 'all_rooms', label: 'All Rooms', icon: '🏨' },
]

export default function EmployeeDashboard() {
  const { profile } = useAuth()
  const [rooms, setRooms] = useState([])
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [activeTab, setActiveTab] = useState('my_rooms')
  const [notification, setNotification] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRooms()
    const channel = supabase
      .channel('rooms-employee')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, payload => {
        if (payload.eventType === 'UPDATE') {
          setRooms(prev => prev.map(r => r.id === payload.new.id ? { ...r, ...payload.new } : r))
          setSelectedRoom(prev => prev?.id === payload.new.id ? { ...prev, ...payload.new } : prev)
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function loadRooms() {
    setLoading(true)
    const { data } = await getRooms()
    if (data) setRooms(data)
    setLoading(false)
  }

  function notify(msg, type = 'success') { setNotification({ msg, type }) }

  function handleRoomUpdate(updatedRoom) {
    setRooms(prev => prev.map(r => r.id === updatedRoom.id ? { ...r, ...updatedRoom } : r))
    if (selectedRoom?.id === updatedRoom.id) setSelectedRoom(prev => ({ ...prev, ...updatedRoom }))
  }

  const myRooms = rooms.filter(r => r.assigned_to === profile?.id)
  const displayRooms = activeTab === 'my_rooms' ? myRooms : rooms
  const floors = [...new Set(displayRooms.map(r => r.floor))].sort((a, b) => a - b)

  const myStats = {
    total: myRooms.length,
    done: myRooms.filter(r => r.status === 'ready').length,
    active: myRooms.filter(r => r.status === 'in_progress').length,
    pending: myRooms.filter(r => r.status === 'checked_out').length,
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #c9a96e, #a07848)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>⬡</div>
      <div className="mono" style={{ fontSize: 12, color: '#888', letterSpacing: '0.15em' }}>LOADING...</div>
    </div>
  )

  return (
    <div>
      <Toast notification={notification} onDismiss={() => setNotification(null)} />
      <Header hotelName="HotelOps" tabs={TABS} activeTab={activeTab} setActiveTab={setActiveTab} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 28px' }}>

        {/* Personal stats bar */}
        <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)', border: '1px solid #2a2a3e', borderRadius: 14, padding: '18px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 32 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Good shift, {profile?.full_name?.split(' ')[0]}!</div>
            <div className="mono" style={{ fontSize: 11, color: '#888' }}>
              {profile?.floors ? `Floors ${profile.floors.join(', ')}` : 'All floors'} · {profile?.role}
            </div>
          </div>
          <div style={{ flex: 1, height: 8, background: '#0d0d14', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: myStats.total > 0 ? `${Math.round((myStats.done / myStats.total) * 100)}%` : '0%', background: 'linear-gradient(90deg, #c9a96e, #2d6a4f)', borderRadius: 4, transition: 'width 0.6s' }} />
          </div>
          <div className="mono" style={{ fontSize: 13, color: '#c9a96e', flexShrink: 0 }}>
            {myStats.done}/{myStats.total} complete
          </div>
          {[
            { label: 'Active', val: myStats.active, color: '#f4a261' },
            { label: 'Pending', val: myStats.pending, color: '#e63946' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', flexShrink: 0 }}>
              <div className="mono" style={{ fontSize: 22, color: s.color }}>{s.val}</div>
              <div className="mono" style={{ fontSize: 9, color: '#666', letterSpacing: '0.1em' }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 22 }}>
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* My rooms view */}
            {activeTab === 'my_rooms' && (
              <div className="fade-in">
                {myRooms.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '80px 20px', color: '#555' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
                    <div style={{ fontSize: 20, fontStyle: 'italic', fontWeight: 300 }}>No rooms assigned to you yet.</div>
                    <div className="mono" style={{ fontSize: 12, color: '#444', marginTop: 8 }}>Your manager will assign rooms to your queue shortly.</div>
                  </div>
                ) : (
                  <div>
                    {/* Priority rooms first */}
                    {myRooms.filter(r => r.priority).length > 0 && (
                      <div style={{ marginBottom: 24 }}>
                        <div className="mono" style={{ fontSize: 11, color: '#e63946', letterSpacing: '0.15em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                          ● PRIORITY ROOMS
                          <div style={{ flex: 1, height: 1, background: '#e6394633' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                          {myRooms.filter(r => r.priority).map(room => <RoomCard key={room.id} room={room} selected={selectedRoom?.id === room.id} onClick={() => setSelectedRoom(selectedRoom?.id === room.id ? null : room)} />)}
                        </div>
                      </div>
                    )}

                    {/* By status */}
                    {['checked_out', 'in_progress', 'inspection', 'dnd', 'maintenance', 'ready', 'occupied'].map(status => {
                      const statusRooms = myRooms.filter(r => r.status === status && !r.priority)
                      if (statusRooms.length === 0) return null
                      const def = getStatusDef(status)
                      return (
                        <div key={status} style={{ marginBottom: 20 }}>
                          <div className="mono" style={{ fontSize: 11, color: def.color, letterSpacing: '0.12em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                            {def.icon} {def.label.toUpperCase()}
                            <div style={{ flex: 1, height: 1, background: def.color + '33' }} />
                            <span style={{ color: '#555' }}>{statusRooms.length}</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                            {statusRooms.map(room => <RoomCard key={room.id} room={room} selected={selectedRoom?.id === room.id} onClick={() => setSelectedRoom(selectedRoom?.id === room.id ? null : room)} />)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* All rooms view */}
            {activeTab === 'all_rooms' && (
              <div className="fade-in">
                <div className="mono" style={{ fontSize: 12, color: '#555', marginBottom: 16 }}>Viewing all hotel rooms (read-only overview)</div>
                {floors.map(floor => {
                  const floorRooms = displayRooms.filter(r => r.floor === floor)
                  return (
                    <div key={floor} style={{ marginBottom: 24 }}>
                      <div className="mono" style={{ fontSize: 11, color: '#c9a96e', letterSpacing: '0.15em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                        FLOOR {floor}
                        <div style={{ flex: 1, height: 1, background: '#2a2a3e' }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                        {floorRooms.map(room => {
                          const def = getStatusDef(room.status)
                          const isMe = room.assigned_to === profile?.id
                          return (
                            <div key={room.id} onClick={() => isMe ? setSelectedRoom(selectedRoom?.id === room.id ? null : room) : null}
                              style={{ background: isMe ? `${def.color}22` : '#1a1a2e', border: `1px solid ${isMe ? def.color + '88' : def.color + '44'}`, borderRadius: 10, padding: '10px 8px', textAlign: 'center', cursor: isMe ? 'pointer' : 'default', opacity: isMe ? 1 : 0.7 }}>
                              <div style={{ fontSize: 16, marginBottom: 3 }}>{def.icon}</div>
                              <div className="mono" style={{ fontSize: 14, color: isMe ? '#e8e0d5' : '#888' }}>{room.room_number}</div>
                              <div className="mono" style={{ fontSize: 9, color: def.color, marginTop: 3 }}>{def.label.toUpperCase()}</div>
                              {isMe && <div className="mono" style={{ fontSize: 9, color: '#c9a96e', marginTop: 2 }}>YOURS</div>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {selectedRoom && (
            <RoomPanel
              room={selectedRoom}
              profiles={[]}
              onClose={() => setSelectedRoom(null)}
              onRoomUpdate={handleRoomUpdate}
              onNotify={notify}
              isAdmin={false}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function RoomCard({ room, selected, onClick }) {
  const def = getStatusDef(room.status)
  return (
    <div onClick={onClick}
      style={{ background: selected ? `${def.color}33` : '#1a1a2e', border: `2px solid ${selected ? def.color : def.color + '66'}`, borderRadius: 12, padding: '14px 10px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.18s', position: 'relative' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = '' }}>
      {room.priority && <div className="pulse" style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: '50%', background: '#e63946' }} />}
      <div style={{ fontSize: 22, marginBottom: 5 }}>{def.icon}</div>
      <div className="mono" style={{ fontSize: 18, color: '#e8e0d5' }}>{room.room_number}</div>
      <div className="mono" style={{ fontSize: 10, color: def.color, marginTop: 4, letterSpacing: '0.08em' }}>{def.label.toUpperCase()}</div>
      {room.guest_prefs && <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>✦ {room.guest_prefs}</div>}
      <div className="mono" style={{ fontSize: 10, color: '#555', marginTop: 4 }}>{timeAgo(room.last_cleaned_at)}</div>
    </div>
  )
}
