import { useState, useEffect, useRef } from 'react'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link: string
  read: boolean
  createdAt: string
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetch = async () => {
    setLoading(true)
    try {
      const data = await api.notifications.list()
      setNotifications(data.notifications)
      setUnread(data.unread)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  const handleMarkRead = async (id: string) => {
    await api.notifications.markRead(id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    setUnread((u) => Math.max(0, u - 1))
  }

  const handleMarkAllRead = async () => {
    await api.notifications.markAllRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnread(0)
  }

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "à l'instant"
    if (mins < 60) return `il y a ${mins} min`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `il y a ${hours}h`
    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) fetch() }}
        className="relative p-2 text-text-muted hover:text-text-primary transition-colors"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-1">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-border-light rounded-xl shadow-xl z-50 max-h-[400px] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-light">
            <h3 className="text-xs font-semibold text-text-primary">Notifications</h3>
            {unread > 0 && (
              <button onClick={handleMarkAllRead} className="text-[10px] text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1">
                <CheckCheck size={12} /> Tout marquer lu
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && notifications.length === 0 && (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={16} className="animate-spin text-text-muted" />
              </div>
            )}
            {!loading && notifications.length === 0 && (
              <p className="text-xs text-text-muted text-center py-8">Aucune notification</p>
            )}
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`px-4 py-3 border-b border-border-light last:border-b-0 cursor-pointer transition-colors hover:bg-gray-50 ${n.read ? '' : 'bg-brand-50/50'}`}
                onClick={() => { if (!n.read) handleMarkRead(n.id) }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`text-xs ${n.read ? 'text-text-primary' : 'text-text-primary font-semibold'}`}>{n.title}</p>
                    <p className="text-[11px] text-text-secondary mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[9px] text-text-muted mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.read && <span className="w-2 h-2 bg-gold rounded-full shrink-0 mt-1" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
