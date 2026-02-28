import { getStatusDef } from '../lib/constants'

export default function RoomGrid({ rooms, selectedRoom, onSelectRoom, floors }) {
  return (
    <div>
      {floors.map(floor => {
        const floorRooms = rooms.filter(r => r.floor === floor)
        if (floorRooms.length === 0) return null
        return (
          <div key={floor} style={{ marginBottom: 28 }}>
            <div className="mono" style={{ fontSize: 11, color: '#c9a96e', letterSpacing: '0.15em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              FLOOR {floor}
              <div style={{ flex: 1, height: 1, background: '#2a2a3e' }} />
              <span style={{ color: '#555' }}>{floorRooms.length} rooms</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 9 }}>
              {floorRooms.map(room => {
                const def = getStatusDef(room.status)
                const isSelected = selectedRoom?.id === room.id
                const dndHours = room.dnd_since ? Math.floor((Date.now() - new Date(room.dnd_since).getTime()) / 3600000) : 0

                return (
                  <div key={room.id} onClick={() => onSelectRoom(isSelected ? null : room)}
                    style={{ background: isSelected ? `${def.color}33` : '#1a1a2e', border: `2px solid ${isSelected ? def.color : def.color + '55'}`, borderRadius: 12, padding: '12px 8px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.18s', position: 'relative' }}
                    onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)' } }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
                    {room.priority && <div className="pulse" style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: '50%', background: '#e63946' }} />}
                    {dndHours >= 4 && <div style={{ position: 'absolute', top: 7, left: 7, width: 7, height: 7, borderRadius: '50%', background: '#ff8080' }} className="pulse" />}
                    <div style={{ fontSize: 19, marginBottom: 4 }}>{def.icon}</div>
                    <div className="mono" style={{ fontSize: 15, fontWeight: 400, color: '#e8e0d5', letterSpacing: '0.04em' }}>{room.room_number}</div>
                    <div className="mono" style={{ fontSize: 9, color: def.color, letterSpacing: '0.08em', marginTop: 4 }}>{def.label.toUpperCase()}</div>
                    {room.assigned_profile?.full_name && (
                      <div className="mono" style={{ fontSize: 9, color: '#666', marginTop: 3 }}>{room.assigned_profile.full_name.split(' ')[0]}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
