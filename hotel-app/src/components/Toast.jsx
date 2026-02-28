import { useEffect } from 'react'

export default function Toast({ notification, onDismiss }) {
  useEffect(() => {
    if (!notification) return
    const t = setTimeout(onDismiss, 3500)
    return () => clearTimeout(t)
  }, [notification])

  if (!notification) return null

  const bg = { success: '#2d6a4f', error: '#7a1f1f', warning: '#6d2d92', info: '#1a5276' }[notification.type] || '#2d6a4f'

  return (
    <div className="slide-in" style={{ position: 'fixed', top: 20, right: 20, zIndex: 999, background: bg, color: '#fff', padding: '12px 20px', borderRadius: 10, fontFamily: 'DM Mono, monospace', fontSize: 13, boxShadow: '0 4px 24px rgba(0,0,0,0.5)', maxWidth: 320, cursor: 'pointer' }} onClick={onDismiss}>
      {notification.msg}
    </div>
  )
}
