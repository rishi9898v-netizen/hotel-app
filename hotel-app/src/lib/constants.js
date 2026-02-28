export const STATUS_FLOW = [
  { id: 'occupied',     label: 'Occupied',     color: '#1a5276', icon: '🛌', next: 'checked_out' },
  { id: 'checked_out',  label: 'Checked Out',  color: '#e63946', icon: '🚪', next: 'in_progress' },
  { id: 'in_progress',  label: 'Cleaning',     color: '#f4a261', icon: '🧹', next: 'inspection'  },
  { id: 'inspection',   label: 'Inspection',   color: '#457b9d', icon: '🔍', next: 'ready'       },
  { id: 'ready',        label: 'Ready',        color: '#2d6a4f', icon: '✅', next: 'occupied'    },
  { id: 'maintenance',  label: 'Maintenance',  color: '#6d2d92', icon: '🔧', next: 'ready'       },
  { id: 'dnd',          label: 'Do Not Disturb', color: '#555', icon: '🚫', next: 'checked_out' },
]

export const CLEAN_EFFORT = ['Light', 'Normal', 'Heavy']

export function getStatusDef(statusId) {
  return STATUS_FLOW.find(s => s.id === statusId) || STATUS_FLOW[0]
}

export function timeAgo(isoString) {
  if (!isoString) return '—'
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(mins / 60)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function formatTime(isoString) {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
