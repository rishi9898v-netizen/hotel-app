import { useState, useEffect } from 'react'
import { STATUS_FLOW, CLEAN_EFFORT, getStatusDef, timeAgo } from '../lib/constants'
import { updateRoom, createMaintenanceTicket, getMaintenanceTickets, resolveTicket, logActivity } from '../lib/supabase'
import { useAuth } from '../lib/auth-context'

export default function RoomPanel({ room, profiles, onClose, onRoomUpdate, onNotify, isAdmin }) {
  const { profile } = useAuth()
  const [tickets, setTickets] = useState([])
  const [maintenanceInput, setMaintenanceInput] = useState('')
  const [saving, setSaving] = useState(false)

  const def = getStatusDef(room.status)
  const nextDef = getStatusDef(def.next)
  const dndHours = room.dnd_since ? Math.floor((Date.now() - new Date(room.dnd_since).getTime()) / 3600000) : 0

  useEffect(() => {
    loadTickets()
  }, [room.id])

  async function loadTickets() {
    const { data } = await getMaintenanceTickets(room.id)
    if (data) setTickets(data)
  }

  async function handleStatusChange(newStatus) {
    setSaving(true)
    const updates = { status: newStatus }
    if (newStatus === 'dnd') updates.dnd_since = new Date().toISOString()
    if (newStatus === 'ready') updates.last_cleaned_at = new Date().toISOString()
    const { data, error } = await updateRoom(room.id, updates)
    if (!error) {
      onRoomUpdate(data)
      await logActivity(room.id, `Status changed to ${newStatus}`, profile.id, { from: room.status, to: newStatus })
      onNotify(`Room ${room.room_number} → ${getStatusDef(newStatus).label}`, 'success')
    }
    setSaving(false)
  }

  async function handleAdvance() {
    await handleStatusChange(def.next)
  }

  async function handleAssign(staffId) {
    const { data, error } = await updateRoom(room.id, { assigned_to: staffId || null })
    if (!error) {
      onRoomUpdate(data)
      const staffName = profiles?.find(p => p.id === staffId)?.full_name
      onNotify(staffId ? `Room ${room.room_number} assigned to ${staffName}` : `Room ${room.room_number} unassigned`, 'info')
      await logActivity(room.id, staffId ? `Assigned to ${staffName}` : 'Unassigned', profile.id)
    }
  }

  async function handleEffort(effort) {
    const { data, error } = await updateRoom(room.id, { clean_effort: effort })
    if (!error) onRoomUpdate(data)
  }

  async function handlePriority() {
    const { data, error } = await updateRoom(room.id, { priority: !room.priority })
    if (!error) onRoomUpdate(data)
  }

  async function handleMaintenance() {
    if (!maintenanceInput.trim()) return
    setSaving(true)
    const { data: ticket, error } = await createMaintenanceTicket(room.id, maintenanceInput, profile.id)
    if (!error) {
      await updateRoom(room.id, { status: 'maintenance' })
      const { data: updated } = await updateRoom(room.id, { status: 'maintenance' })
      onRoomUpdate(updated)
      setTickets(t => [{ ...ticket, creator: { full_name: profile.full_name } }, ...t])
      setMaintenanceInput('')
      onNotify(`Maintenance ticket created for Room ${room.room_number}`, 'warning')
      await logActivity(room.id, 'Maintenance ticket created', profile.id, { note: maintenanceInput })
    }
    setSaving(false)
  }

  async function handleResolve(ticketId) {
    const { error } = await resolveTicket(ticketId)
    if (!error) {
      setTickets(t => t.map(tk => tk.id === ticketId ? { ...tk, status: 'resolved' } : tk))
      onNotify('Ticket resolved', 'success')
    }
  }

  const assignedStaff = room.assigned_profile || profiles?.find(p => p.id === room.assigned_to)

  return (
    <div className="fade-in" style={{ width: 310, flexShrink: 0 }}>
      <div style={{ background: '#1a1a2e', borderRadius: 16, border: `1px solid ${def.color}66`, overflow: 'hidden', position: 'sticky', top: 84, maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ background: `linear-gradient(135deg, ${def.color}44, ${def.color}18)`, padding: '18px 18px 14px', borderBottom: `1px solid ${def.color}44` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="label">Room</div>
              <div className="mono" style={{ fontSize: 44, fontWeight: 300, color: '#e8e0d5', lineHeight: 1 }}>{room.room_number}</div>
              <div className="mono" style={{ fontSize: 11, color: '#888' }}>Floor {room.floor}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 30, marginBottom: 2 }}>{def.icon}</div>
              <div className="mono" style={{ fontSize: 11, color: def.color, letterSpacing: '0.08em' }}>{def.label.toUpperCase()}</div>
              {room.priority && <div className="mono pulse" style={{ fontSize: 10, color: '#e63946', marginTop: 4 }}>● PRIORITY</div>}
            </div>
          </div>
          <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: '#0d0d1488', border: '1px solid #333', borderRadius: 6, color: '#888', padding: '3px 8px', fontSize: 12 }}>✕</button>
        </div>

        <div style={{ padding: 16 }}>
          {/* Advance */}
          <button onClick={handleAdvance} disabled={saving}
            style={{ width: '100%', padding: 11, background: `${nextDef.color}22`, border: `1px solid ${nextDef.color}66`, borderRadius: 10, color: nextDef.color, fontSize: 15, marginBottom: 14 }}>
            {nextDef.icon} Advance → {nextDef.label}
          </button>

          {/* Status grid */}
          <div className="label" style={{ marginBottom: 8 }}>Set Status</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 16 }}>
            {STATUS_FLOW.map(s => (
              <div key={s.id} onClick={() => handleStatusChange(s.id)}
                style={{ padding: '5px 9px', borderRadius: 20, fontSize: 11, fontFamily: 'DM Mono, monospace', background: room.status === s.id ? `${s.color}44` : '#0d0d14', border: `1px solid ${s.color}${room.status === s.id ? '99' : '44'}`, color: s.color, cursor: 'pointer', transition: 'all 0.15s' }}>
                {s.icon} {s.label}
              </div>
            ))}
          </div>

          {/* Assign staff (admin only) */}
          {isAdmin && (
            <div style={{ marginBottom: 14 }}>
              <div className="label" style={{ marginBottom: 8 }}>Assign Housekeeper</div>
              <select value={room.assigned_to || ''} onChange={e => handleAssign(e.target.value || null)}>
                <option value="">— Unassigned —</option>
                {profiles?.filter(p => p.role !== 'admin').map(p => (
                  <option key={p.id} value={p.id}>{p.full_name} {p.floors ? `(Floors ${p.floors.join(', ')})` : ''}</option>
                ))}
              </select>
            </div>
          )}

          {assignedStaff && (
            <div style={{ marginBottom: 14, padding: '8px 12px', background: '#0d0d14', borderRadius: 8, border: '1px solid #c9a96e33', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #c9a96e, #a07848)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#1a1a2e', fontSize: 13 }}>
                {assignedStaff.avatar_initial || assignedStaff.full_name?.[0]}
              </div>
              <div>
                <div style={{ fontSize: 13 }}>{assignedStaff.full_name}</div>
                <div className="mono" style={{ fontSize: 10, color: '#888' }}>ASSIGNED</div>
              </div>
            </div>
          )}

          {/* Effort */}
          <div style={{ marginBottom: 14 }}>
            <div className="label" style={{ marginBottom: 8 }}>Clean Effort</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {CLEAN_EFFORT.map(e => (
                <div key={e} onClick={() => handleEffort(e)}
                  style={{ flex: 1, textAlign: 'center', padding: '7px 0', borderRadius: 8, fontSize: 12, fontFamily: 'DM Mono, monospace', background: room.clean_effort === e ? '#c9a96e22' : '#0d0d14', border: `1px solid ${room.clean_effort === e ? '#c9a96e' : '#333'}`, color: room.clean_effort === e ? '#c9a96e' : '#666', cursor: 'pointer', transition: 'all 0.15s' }}>
                  {e}
                </div>
              ))}
            </div>
          </div>

          {/* Priority toggle */}
          {isAdmin && (
            <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="label">Priority Flag</span>
              <div onClick={handlePriority} style={{ width: 44, height: 24, borderRadius: 12, background: room.priority ? '#e6394633' : '#0d0d14', border: `1px solid ${room.priority ? '#e63946' : '#333'}`, cursor: 'pointer', position: 'relative', transition: 'all 0.2s' }}>
                <div style={{ position: 'absolute', top: 3, left: room.priority ? 22 : 3, width: 16, height: 16, borderRadius: '50%', background: room.priority ? '#e63946' : '#555', transition: 'left 0.2s' }} />
              </div>
            </div>
          )}

          {/* Guest prefs */}
          {room.guest_prefs && (
            <div style={{ marginBottom: 14, padding: '10px 12px', background: '#0d0d14', borderRadius: 8, border: '1px solid #c9a96e33' }}>
              <div className="label" style={{ marginBottom: 4 }}>Guest Preference</div>
              <div style={{ fontSize: 13, color: '#e8e0d5' }}>✦ {room.guest_prefs}</div>
            </div>
          )}

          {/* DND alert */}
          {room.status === 'dnd' && dndHours >= 4 && (
            <div style={{ marginBottom: 14, padding: '10px 12px', background: '#3d1a1a', borderRadius: 8, border: '1px solid #6b2222', fontSize: 12, color: '#ff8080', fontFamily: 'DM Mono, monospace' }}>
              ⚠ DND for {dndHours}h — Welfare check recommended
            </div>
          )}

          {/* Last cleaned */}
          <div style={{ marginBottom: 14, fontSize: 12, color: '#888', fontFamily: 'DM Mono, monospace' }}>
            LAST CLEAN: <span style={{ color: '#c9a96e' }}>{timeAgo(room.last_cleaned_at)}</span>
          </div>

          {/* Maintenance tickets */}
          <div>
            <div className="label" style={{ marginBottom: 8 }}>Maintenance</div>
            {tickets.filter(t => t.status === 'open').map(t => (
              <div key={t.id} style={{ marginBottom: 8, padding: '10px 12px', background: '#0d0d14', borderRadius: 8, border: '1px solid #6d2d9244' }}>
                <div style={{ fontSize: 12, color: '#f4a261', marginBottom: 6 }}>🔧 {t.note}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="mono" style={{ fontSize: 10, color: '#666' }}>By {t.creator?.full_name}</div>
                  {isAdmin && <button onClick={() => handleResolve(t.id)} style={{ padding: '3px 9px', background: '#2d6a4f22', border: '1px solid #2d6a4f66', borderRadius: 6, color: '#2d6a4f', fontSize: 11, fontFamily: 'DM Mono, monospace' }}>Resolve</button>}
                </div>
              </div>
            ))}
            <textarea value={maintenanceInput} onChange={e => setMaintenanceInput(e.target.value)} placeholder="Describe issue..." rows={2} style={{ marginBottom: 8, resize: 'vertical' }} />
            <button onClick={handleMaintenance} disabled={saving || !maintenanceInput.trim()}
              style={{ width: '100%', padding: 9, background: '#6d2d9222', border: '1px solid #6d2d9266', borderRadius: 8, color: '#b060e0', fontSize: 14 }}>
              🔧 Create Maintenance Ticket
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
