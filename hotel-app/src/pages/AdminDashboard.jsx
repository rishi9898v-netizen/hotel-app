import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../lib/auth-context'
import { getRooms, getProfiles, getActivityLog, getHotelConfig, updateHotelConfig, supabase } from '../lib/supabase'
import { STATUS_FLOW, getStatusDef } from '../lib/constants'
import Header from '../components/Header'
import Toast from '../components/Toast'
import RoomGrid from '../components/RoomGrid'
import RoomPanel from '../components/RoomPanel'

const TABS = [
  { id: 'rooms', label: 'Rooms', icon: '🏨' },
  { id: 'staff', label: 'Staff', icon: '👥' },
  { id: 'analytics', label: 'Analytics', icon: '📊' },
  { id: 'activity', label: 'Activity', icon: '📋' },
]

export default function AdminDashboard() {
  const { profile } = useAuth()
  const [rooms, setRooms] = useState([])
  const [profiles, setProfiles] = useState([])
  const [activityLog, setActivityLog] = useState([])
  const [hotelConfig, setHotelConfig] = useState({ name: 'Grand Meridian Hotel' })
  const [activeTab, setActiveTab] = useState('rooms')
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterFloor, setFilterFloor] = useState('all')
  const [filterStaff, setFilterStaff] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [notification, setNotification] = useState(null)
  const [configModal, setConfigModal] = useState(false)
  const [configDraft, setConfigDraft] = useState({})
  const [addEmployeeModal, setAddEmployeeModal] = useState(false)
  const [newEmployee, setNewEmployee] = useState({ email: '', full_name: '', role: 'housekeeper', floors: '' })
  const [addEmployeeLoading, setAddEmployeeLoading] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAll()
    // Subscribe to real-time room updates
    const channel = supabase
      .channel('rooms-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, payload => {
        if (payload.eventType === 'UPDATE') {
          setRooms(prev => prev.map(r => r.id === payload.new.id ? { ...r, ...payload.new } : r))
          setSelectedRoom(prev => prev?.id === payload.new.id ? { ...prev, ...payload.new } : prev)
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log' }, payload => {
        setActivityLog(prev => [payload.new, ...prev].slice(0, 50))
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: roomData }, { data: profileData }, { data: logData }, { data: configData }] = await Promise.all([
      getRooms(), getProfiles(), getActivityLog(), getHotelConfig()
    ])
    if (roomData) setRooms(roomData)
    if (profileData) setProfiles(profileData)
    if (logData) setActivityLog(logData)
    if (configData) { setHotelConfig(configData); setConfigDraft(configData) }
    setLoading(false)
  }

  function notify(msg, type = 'success') { setNotification({ msg, type }) }

  function handleRoomUpdate(updatedRoom) {
    setRooms(prev => prev.map(r => r.id === updatedRoom.id ? { ...r, ...updatedRoom } : r))
    if (selectedRoom?.id === updatedRoom.id) setSelectedRoom(prev => ({ ...prev, ...updatedRoom }))
  }

  async function saveHotelConfig() {
    const { data } = await updateHotelConfig(configDraft)
    if (data) { setHotelConfig(data); notify('Hotel configuration saved!') }
    setConfigModal(false)
  }

  async function handleAddEmployee() {
    setAddEmployeeLoading(true)
    const floorArr = newEmployee.floors ? newEmployee.floors.split(',').map(f => parseInt(f.trim())).filter(Boolean) : []
    // Create auth user via Supabase (they'll get a password reset email)
    const { data, error } = await supabase.auth.admin?.createUser?.({
      email: newEmployee.email,
      password: 'TempPass123!',
      user_metadata: { full_name: newEmployee.full_name, role: newEmployee.role, floors: floorArr },
      email_confirm: true,
    }) || {}
    if (error) {
      notify('Could not create user — use Supabase dashboard to add users manually', 'error')
    } else {
      notify(`${newEmployee.full_name} added! They can log in with the temporary password.`, 'success')
      setAddEmployeeModal(false)
      setNewEmployee({ email: '', full_name: '', role: 'housekeeper', floors: '' })
      loadAll()
    }
    setAddEmployeeLoading(false)
  }

  const floors = [...new Set(rooms.map(r => r.floor))].sort((a, b) => a - b)

  const filteredRooms = rooms.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false
    if (filterFloor !== 'all' && r.floor !== parseInt(filterFloor)) return false
    if (filterStaff !== 'all' && r.assigned_to !== filterStaff) return false
    if (searchQuery && !r.room_number?.toString().includes(searchQuery)) return false
    return true
  })

  const stats = {
    total: rooms.length,
    ready: rooms.filter(r => r.status === 'ready').length,
    cleaning: rooms.filter(r => r.status === 'in_progress').length,
    checkedOut: rooms.filter(r => r.status === 'checked_out').length,
    occupied: rooms.filter(r => r.status === 'occupied').length,
    maintenance: rooms.filter(r => r.status === 'maintenance').length,
    dnd: rooms.filter(r => r.status === 'dnd').length,
  }

  const dndAlerts = rooms.filter(r => r.status === 'dnd' && r.dnd_since && (Date.now() - new Date(r.dnd_since).getTime()) > 14400000)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #c9a96e, #a07848)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>⬡</div>
      <div className="mono" style={{ fontSize: 12, color: '#888', letterSpacing: '0.15em' }}>LOADING ROOMS...</div>
    </div>
  )

  return (
    <div>
      <Toast notification={notification} onDismiss={() => setNotification(null)} />

      <Header
        hotelName={hotelConfig.name}
        tabs={TABS}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        extraRight={
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setAddEmployeeModal(true)} style={{ padding: '7px 14px', background: '#2d6a4f22', border: '1px solid #2d6a4f66', borderRadius: 8, color: '#2d6a4f', fontSize: 13, fontFamily: 'DM Mono, monospace' }}>
              + Employee
            </button>
            <button onClick={() => { setConfigDraft(hotelConfig); setConfigModal(true) }} style={{ padding: '7px 14px', background: '#2a2a3e', border: '1px solid #333', borderRadius: 8, color: '#c9a96e', fontSize: 13, fontFamily: 'DM Mono, monospace' }}>
              ⚙ Config
            </button>
          </div>
        }
      />

      {/* DND Alert Banner */}
      {dndAlerts.length > 0 && (
        <div style={{ background: '#3d1a1a', borderBottom: '1px solid #6b2222', padding: '9px 28px' }}>
          <div className="mono" style={{ fontSize: 12, color: '#ff8080', maxWidth: 1400, margin: '0 auto' }}>
            ⚠ WELFARE CHECK: Rooms {dndAlerts.map(r => r.room_number).join(', ')} on DND 4+ hours
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 28px' }}>

        {activeTab === 'rooms' && (
          <div className="fade-in" style={{ display: 'flex', gap: 22 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'Ready', val: stats.ready, color: '#2d6a4f', icon: '✅', filter: 'ready' },
                  { label: 'Cleaning', val: stats.cleaning, color: '#f4a261', icon: '🧹', filter: 'in_progress' },
                  { label: 'Checked Out', val: stats.checkedOut, color: '#e63946', icon: '🚪', filter: 'checked_out' },
                  { label: 'Occupied', val: stats.occupied, color: '#1a5276', icon: '🛌', filter: 'occupied' },
                  { label: 'Maintenance', val: stats.maintenance, color: '#6d2d92', icon: '🔧', filter: 'maintenance' },
                  { label: 'DND', val: stats.dnd, color: '#555', icon: '🚫', filter: 'dnd' },
                ].map(s => (
                  <div key={s.label} onClick={() => setFilterStatus(filterStatus === s.filter ? 'all' : s.filter)}
                    style={{ background: '#1a1a2e', border: `1px solid ${filterStatus === s.filter ? s.color : s.color + '44'}`, borderRadius: 12, padding: '12px 14px', cursor: 'pointer', transition: 'all 0.18s' }}>
                    <div style={{ fontSize: 18, marginBottom: 3 }}>{s.icon}</div>
                    <div className="mono" style={{ fontSize: 24, color: s.color }}>{s.val}</div>
                    <div className="mono" style={{ fontSize: 9, color: '#666', letterSpacing: '0.08em' }}>{s.label.toUpperCase()}</div>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
                <input placeholder="Room #..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: 130 }} />
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 160 }}>
                  <option value="all">All Statuses</option>
                  {STATUS_FLOW.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
                </select>
                <select value={filterFloor} onChange={e => setFilterFloor(e.target.value)} style={{ width: 130 }}>
                  <option value="all">All Floors</option>
                  {floors.map(f => <option key={f} value={f}>Floor {f}</option>)}
                </select>
                <select value={filterStaff} onChange={e => setFilterStaff(e.target.value)} style={{ width: 180 }}>
                  <option value="all">All Staff</option>
                  {profiles.filter(p => p.role !== 'admin').map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
                <button onClick={() => { setFilterStatus('all'); setFilterFloor('all'); setFilterStaff('all'); setSearchQuery('') }} style={{ padding: '9px 14px', background: '#2a2a3e', borderRadius: 8, color: '#888', fontSize: 12, fontFamily: 'DM Mono, monospace', border: '1px solid #333' }}>
                  Clear
                </button>
                <div className="mono" style={{ marginLeft: 'auto', fontSize: 12, color: '#555', display: 'flex', alignItems: 'center' }}>
                  {filteredRooms.length}/{stats.total} rooms
                </div>
              </div>

              <RoomGrid rooms={filteredRooms} selectedRoom={selectedRoom} onSelectRoom={setSelectedRoom} floors={floors} />
            </div>

            {selectedRoom && (
              <RoomPanel
                room={selectedRoom}
                profiles={profiles}
                onClose={() => setSelectedRoom(null)}
                onRoomUpdate={handleRoomUpdate}
                onNotify={notify}
                isAdmin={true}
              />
            )}
          </div>
        )}

        {activeTab === 'staff' && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 22, fontWeight: 300, color: '#c9a96e', fontStyle: 'italic' }}>Staff & Workload</div>
              <button onClick={() => setAddEmployeeModal(true)} style={{ padding: '9px 18px', background: 'linear-gradient(135deg, #c9a96e, #a07848)', borderRadius: 10, color: '#1a1a2e', fontSize: 14, fontWeight: 600 }}>
                + Add Employee
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {profiles.filter(p => p.role !== 'admin').map(staff => {
                const assigned = rooms.filter(r => r.assigned_to === staff.id)
                const inProgress = assigned.filter(r => r.status === 'in_progress').length
                const done = assigned.filter(r => r.status === 'ready').length
                const heavy = assigned.filter(r => r.clean_effort === 'Heavy').length
                return (
                  <div key={staff.id} style={{ background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 14, padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #c9a96e, #a07848)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#1a1a2e', fontSize: 18 }}>
                        {staff.avatar_initial || staff.full_name?.[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: 17, fontWeight: 600 }}>{staff.full_name}</div>
                        <div className="mono" style={{ fontSize: 10, color: '#888' }}>{staff.role?.toUpperCase()} · {staff.email}</div>
                        {staff.floors && <div className="mono" style={{ fontSize: 10, color: '#c9a96e' }}>Floors {staff.floors.join(', ')}</div>}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                      {[['Assigned', assigned.length, '#c9a96e'], ['Active', inProgress, '#f4a261'], ['Done', done, '#2d6a4f']].map(([l, v, c]) => (
                        <div key={l} style={{ background: '#0d0d14', borderRadius: 8, padding: '10px 6px', textAlign: 'center' }}>
                          <div className="mono" style={{ fontSize: 22, color: c }}>{v}</div>
                          <div className="mono" style={{ fontSize: 9, color: '#666', letterSpacing: '0.1em' }}>{l.toUpperCase()}</div>
                        </div>
                      ))}
                    </div>
                    {heavy > 0 && <div className="mono" style={{ fontSize: 11, color: '#e63946', marginBottom: 10 }}>⚠ {heavy} heavy clean{heavy > 1 ? 's' : ''}</div>}
                    <div className="mono" style={{ fontSize: 11, color: '#555' }}>
                      {assigned.length > 0 ? `Rooms: ${assigned.map(r => r.room_number).join(', ')}` : 'No rooms assigned'}
                    </div>
                  </div>
                )
              })}
              {profiles.filter(p => p.role !== 'admin').length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: '#555', fontStyle: 'italic' }}>
                  No employees yet. Add your first staff member →
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="fade-in">
            <div style={{ fontSize: 22, fontWeight: 300, color: '#c9a96e', fontStyle: 'italic', marginBottom: 20 }}>Analytics & Insights</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div style={{ background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 14, padding: 20 }}>
                <div className="label" style={{ marginBottom: 14 }}>Occupancy Breakdown</div>
                {STATUS_FLOW.map(s => {
                  const count = rooms.filter(r => r.status === s.id).length
                  const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                  return (
                    <div key={s.id} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, fontFamily: 'DM Mono, monospace' }}>
                        <span style={{ color: '#aaa' }}>{s.icon} {s.label}</span>
                        <span style={{ color: s.color }}>{count} ({pct}%)</span>
                      </div>
                      <div style={{ height: 4, background: '#0d0d14', borderRadius: 2 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: s.color, borderRadius: 2, transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 14, padding: 20 }}>
                <div className="label" style={{ marginBottom: 14 }}>Predictive Insights</div>
                {[
                  { icon: '⚡', text: `Est. cleaning backlog: ~${Math.ceil((stats.checkedOut + stats.cleaning) * 22)} minutes`, color: '#f4a261' },
                  { icon: '👥', text: `Recommended staff: ${Math.max(1, Math.ceil((stats.checkedOut + stats.cleaning) / 5))} housekeepers`, color: '#2d6a4f' },
                  { icon: '🏨', text: `Occupancy: ${stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0}% — ${stats.occupied > stats.total * 0.8 ? 'High season' : 'Standard'}`, color: '#c9a96e' },
                  { icon: '🔮', text: `~${Math.floor(stats.occupied * 0.3)} rooms expected to check out in next 2h`, color: '#457b9d' },
                  { icon: '⚠', text: `${rooms.filter(r => r.priority).length} priority rooms flagged`, color: '#e63946' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 12, padding: '10px 12px', background: '#0d0d14', borderRadius: 8, border: `1px solid ${item.color}22` }}>
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <span style={{ fontSize: 13, color: item.color, lineHeight: 1.5 }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 14, padding: 20 }}>
              <div className="label" style={{ marginBottom: 14 }}>Staff Performance Today</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {profiles.filter(p => p.role !== 'admin').map(staff => {
                  const staffRooms = rooms.filter(r => r.assigned_to === staff.id)
                  const completed = staffRooms.filter(r => r.status === 'ready').length
                  const total = staffRooms.length
                  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
                  return (
                    <div key={staff.id} style={{ background: '#0d0d14', borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{staff.full_name}</div>
                      <div style={{ height: 6, background: '#1a1a2e', borderRadius: 3, marginBottom: 6 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #c9a96e, #2d6a4f)', borderRadius: 3, transition: 'width 0.5s' }} />
                      </div>
                      <div className="mono" style={{ fontSize: 11, color: '#888' }}>{completed}/{total} rooms · {pct}%</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="fade-in">
            <div style={{ fontSize: 22, fontWeight: 300, color: '#c9a96e', fontStyle: 'italic', marginBottom: 20 }}>Activity Log</div>
            <div style={{ background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 14, overflow: 'hidden' }}>
              {activityLog.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#555', fontStyle: 'italic' }}>No activity yet</div>
              ) : activityLog.map((log, i) => (
                <div key={log.id || i} style={{ padding: '13px 20px', borderBottom: '1px solid #2a2a3e', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div className="mono" style={{ fontSize: 11, color: '#555', flexShrink: 0 }}>
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#0d0d14', border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Mono, monospace', fontSize: 13, color: '#c9a96e', flexShrink: 0 }}>
                    {log.room_id ? rooms.find(r => r.id === log.room_id)?.room_number?.slice(-2) : '—'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14 }}>{log.action}</div>
                    <div className="mono" style={{ fontSize: 11, color: '#888' }}>
                      Room {rooms.find(r => r.id === log.room_id)?.room_number || '?'} · by {log.actor?.full_name || 'System'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Config Modal */}
      {configModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setConfigModal(false)}>
          <div onClick={e => e.stopPropagation()} className="fade-in" style={{ background: '#1a1a2e', borderRadius: 18, border: '1px solid #c9a96e44', padding: 32, width: 420 }}>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 20, color: '#c9a96e' }}>⚙ Hotel Configuration</div>
            {[
              { key: 'name', label: 'Hotel Name', type: 'text' },
              { key: 'address', label: 'Address', type: 'text' },
              { key: 'phone', label: 'Phone', type: 'text' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <div className="label" style={{ marginBottom: 7 }}>{f.label}</div>
                <input type={f.type} value={configDraft[f.key] || ''} onChange={e => setConfigDraft(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={saveHotelConfig} style={{ flex: 1, padding: 12, background: 'linear-gradient(135deg, #c9a96e, #a07848)', borderRadius: 10, color: '#1a1a2e', fontSize: 15, fontWeight: 600 }}>Save</button>
              <button onClick={() => setConfigModal(false)} style={{ padding: '12px 18px', background: '#0d0d14', borderRadius: 10, color: '#888', border: '1px solid #333', fontSize: 15 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {addEmployeeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setAddEmployeeModal(false)}>
          <div onClick={e => e.stopPropagation()} className="fade-in" style={{ background: '#1a1a2e', borderRadius: 18, border: '1px solid #2d6a4f66', padding: 32, width: 420 }}>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 20, color: '#2d6a4f' }}>+ Add Employee</div>
            <div style={{ marginBottom: 13 }}>
              <div className="label" style={{ marginBottom: 7 }}>Full Name</div>
              <input value={newEmployee.full_name} onChange={e => setNewEmployee(p => ({ ...p, full_name: e.target.value }))} placeholder="Jane Smith" />
            </div>
            <div style={{ marginBottom: 13 }}>
              <div className="label" style={{ marginBottom: 7 }}>Email</div>
              <input type="email" value={newEmployee.email} onChange={e => setNewEmployee(p => ({ ...p, email: e.target.value }))} placeholder="jane@hotel.com" />
            </div>
            <div style={{ marginBottom: 13 }}>
              <div className="label" style={{ marginBottom: 7 }}>Role</div>
              <select value={newEmployee.role} onChange={e => setNewEmployee(p => ({ ...p, role: e.target.value }))}>
                <option value="housekeeper">Housekeeper</option>
                <option value="inspector">Inspector</option>
                <option value="maintenance">Maintenance</option>
                <option value="supervisor">Supervisor</option>
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div className="label" style={{ marginBottom: 7 }}>Assigned Floors (comma-separated, e.g. 1,2,3)</div>
              <input value={newEmployee.floors} onChange={e => setNewEmployee(p => ({ ...p, floors: e.target.value }))} placeholder="1,2,3" />
            </div>
            <div style={{ padding: '12px 14px', background: '#0d0d14', borderRadius: 8, marginBottom: 18, border: '1px solid #333' }}>
              <div className="mono" style={{ fontSize: 11, color: '#888' }}>Note: For full user creation, use the Supabase dashboard → Authentication → Add User. This creates the login credentials. Then update the profile in the profiles table.</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleAddEmployee} disabled={addEmployeeLoading || !newEmployee.email || !newEmployee.full_name}
                style={{ flex: 1, padding: 12, background: addEmployeeLoading ? '#555' : 'linear-gradient(135deg, #2d6a4f, #1a4f37)', borderRadius: 10, color: '#e8e0d5', fontSize: 15, fontWeight: 600 }}>
                {addEmployeeLoading ? 'Adding...' : 'Add Employee'}
              </button>
              <button onClick={() => setAddEmployeeModal(false)} style={{ padding: '12px 18px', background: '#0d0d14', borderRadius: 10, color: '#888', border: '1px solid #333', fontSize: 15 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
