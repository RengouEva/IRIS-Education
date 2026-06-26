import { Router, Request, Response } from 'express'
import { z } from 'zod'
import db from '../database'
import { authMiddleware } from '../middleware/auth'
import { createNotification } from './notifications'
import crypto from 'crypto'

const router = Router()
router.use(authMiddleware)

const commentSchema = z.object({
  sectionId: z.string(),
  content: z.string().min(1),
  anchorText: z.string().optional(),
  audioUrl: z.string().optional(),
})

const replySchema = z.object({
  content: z.string().min(1),
  audioUrl: z.string().optional(),
})

router.get('/', (req: Request, res: Response) => {
  const { sectionId, projectId } = req.query
  let comments: any[]
  if (sectionId) {
    comments = db.prepare('SELECT * FROM comments WHERE sectionId = ? ORDER BY createdAt DESC').all(sectionId as string) as any[]
  } else if (projectId) {
    comments = db.prepare(`
      SELECT c.* FROM comments c
      JOIN sections s ON s.id = c.sectionId
      WHERE s.projectId = ?
      ORDER BY c.createdAt DESC
    `).all(projectId as string) as any[]
  } else {
    res.status(400).json({ error: 'sectionId ou projectId requis' })
    return
  }
  const result = comments.map((c: any) => ({
    ...c,
    resolved: !!c.resolved,
    replies: db.prepare('SELECT * FROM comment_replies WHERE commentId = ? ORDER BY createdAt').all(c.id),
  }))
  res.json(result)
})

router.post('/', (req: Request, res: Response) => {
  const parsed = commentSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Données invalides', details: parsed.error.issues }); return }
  const { sectionId, content, anchorText, audioUrl } = parsed.data
  const section = db.prepare('SELECT * FROM sections WHERE id = ?').get(sectionId) as any
  if (!section) { res.status(404).json({ error: 'Section non trouvée' }); return }
  const user = db.prepare('SELECT id, firstname, lastname, avatar FROM users WHERE id = ?').get(req.user!.userId) as any
  const id = crypto.randomUUID()
  db.prepare(`
    INSERT INTO comments (id, sectionId, userId, userName, avatar, content, anchorText, audioUrl)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, sectionId, req.user!.userId, `${user.firstname} ${user.lastname}`, user.avatar || '', content, anchorText || '', audioUrl || '')
  const created = db.prepare('SELECT * FROM comments WHERE id = ?').get(id) as any

  const project = db.prepare('SELECT userId FROM projects WHERE id = (SELECT projectId FROM sections WHERE id = ?)').get(sectionId) as any
  if (project && project.userId !== req.user!.userId) {
    createNotification(project.userId, 'comment', 'Nouveau commentaire',
      `${user.firstname} ${user.lastname} a commenté une section.`, `/editor/${project.userId}`)
  }

  res.status(201).json({ ...created, resolved: false, replies: [] })
})

router.put('/:id/resolve', (req: Request, res: Response) => {
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id) as any
  if (!comment) { res.status(404).json({ error: 'Commentaire non trouvé' }); return }
  db.prepare("UPDATE comments SET resolved = 1, resolvedAt = datetime('now') WHERE id = ?").run(req.params.id)
  res.json({ success: true })
})

router.post('/:id/replies', (req: Request, res: Response) => {
  const parsed = replySchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Données invalides', details: parsed.error.issues }); return }
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id) as any
  if (!comment) { res.status(404).json({ error: 'Commentaire non trouvé' }); return }
  const user = db.prepare('SELECT id, firstname, lastname, avatar FROM users WHERE id = ?').get(req.user!.userId) as any
  const id = crypto.randomUUID()
  const { audioUrl } = parsed.data
  db.prepare(`
    INSERT INTO comment_replies (id, commentId, userId, userName, avatar, content, audioUrl)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.params.id, req.user!.userId, `${user.firstname} ${user.lastname}`, user.avatar || '', parsed.data.content, audioUrl || '')
  const created = db.prepare('SELECT * FROM comment_replies WHERE id = ?').get(id)
  res.status(201).json(created)
})

export default router
