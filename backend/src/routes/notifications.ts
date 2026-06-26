import { Router, Request, Response } from 'express'
import db from '../database'
import { authMiddleware } from '../middleware/auth'
import crypto from 'crypto'

const router = Router()
router.use(authMiddleware)

router.get('/', (req: Request, res: Response) => {
  const notifications = db.prepare(
    'SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 50'
  ).all(req.user!.userId) as any[]
  const unread = (db.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE userId = ? AND read = 0'
  ).get(req.user!.userId) as any).count
  res.json({ notifications: notifications.map((n) => ({ ...n, read: !!n.read })), unread })
})

router.put('/:id/read', (req: Request, res: Response) => {
  const notif = db.prepare('SELECT * FROM notifications WHERE id = ? AND userId = ?')
    .get(req.params.id, req.user!.userId) as any
  if (!notif) { res.status(404).json({ error: 'Notification non trouvée' }); return }
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

router.put('/read-all', (req: Request, res: Response) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE userId = ? AND read = 0').run(req.user!.userId)
  res.json({ success: true })
})

export function createNotification(userId: string, type: string, title: string, message: string, link?: string) {
  db.prepare(
    'INSERT INTO notifications (id, userId, type, title, message, link) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(crypto.randomUUID(), userId, type, title, message, link || '')
}

export default router
