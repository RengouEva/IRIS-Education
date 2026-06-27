import { Router, Request, Response } from 'express'
import db from '../database.js'
import { authMiddleware } from '../middleware/auth.js'
import crypto from 'crypto'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: Request, res: Response) => {
  const notifications = await db.all(
    'SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 50',
    req.user!.userId
  ) as any[]
  const row = await db.get(
    'SELECT COUNT(*) as count FROM notifications WHERE userId = ? AND read = 0',
    req.user!.userId
  ) as any
  res.json({ notifications: notifications.map((n: any) => ({ ...n, read: !!n.read })), unread: row.count })
})

router.put('/:id/read', async (req: Request, res: Response) => {
  const notif = await db.get('SELECT * FROM notifications WHERE id = ? AND userId = ?',
    req.params.id as string, req.user!.userId) as any
  if (!notif) { res.status(404).json({ error: 'Notification non trouvée' }); return }
  await db.run('UPDATE notifications SET read = 1 WHERE id = ?', req.params.id as string)
  res.json({ success: true })
})

router.put('/read-all', async (req: Request, res: Response) => {
  await db.run('UPDATE notifications SET read = 1 WHERE userId = ? AND read = 0', req.user!.userId)
  res.json({ success: true })
})

export async function createNotification(userId: string, type: string, title: string, message: string, link?: string) {
  await db.run(
    'INSERT INTO notifications (id, userId, type, title, message, link) VALUES (?, ?, ?, ?, ?, ?)',
    crypto.randomUUID(), userId, type, title, message, link || ''
  )
}

export default router
