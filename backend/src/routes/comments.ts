import { Router, Request, Response } from 'express'
import { z } from 'zod'
import db from '../database.js'
import { authMiddleware } from '../middleware/auth.js'
import { createNotification } from './notifications.js'
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

router.get('/', async (req: Request, res: Response) => {
  const { sectionId, projectId } = req.query
  let comments: any[]
  if (sectionId) {
    comments = await db.all('SELECT * FROM comments WHERE sectionId = ? ORDER BY createdAt DESC', sectionId as string) as any[]
  } else if (projectId) {
    comments = await db.all(`
      SELECT c.* FROM comments c
      JOIN sections s ON s.id = c.sectionId
      WHERE s.projectId = ?
      ORDER BY c.createdAt DESC
    `, projectId as string) as any[]
  } else {
    res.status(400).json({ error: 'sectionId ou projectId requis' })
    return
  }
  const result = await Promise.all(comments.map(async (c: any) => ({
    ...c,
    resolved: !!c.resolved,
    replies: await db.all('SELECT * FROM comment_replies WHERE commentId = ? ORDER BY createdAt', c.id),
  })))
  res.json(result)
})

router.post('/', async (req: Request, res: Response) => {
  const parsed = commentSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Données invalides', details: parsed.error.issues }); return }
  const { sectionId, content, anchorText, audioUrl } = parsed.data
  const section = await db.get('SELECT * FROM sections WHERE id = ?', sectionId) as any
  if (!section) { res.status(404).json({ error: 'Section non trouvée' }); return }
  const user = await db.get('SELECT id, firstname, lastname, avatar FROM users WHERE id = ?', req.user!.userId) as any
  const id = crypto.randomUUID()
  await db.run(`
    INSERT INTO comments (id, sectionId, userId, userName, avatar, content, anchorText, audioUrl)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, id, sectionId, req.user!.userId, `${user.firstname} ${user.lastname}`, user.avatar || '', content, anchorText || '', audioUrl || '')
  const created = await db.get('SELECT * FROM comments WHERE id = ?', id) as any

  const project = await db.get('SELECT userId FROM projects WHERE id = (SELECT projectId FROM sections WHERE id = ?)', sectionId) as any
  if (project && project.userId !== req.user!.userId) {
    createNotification(project.userId, 'comment', 'Nouveau commentaire',
      `${user.firstname} ${user.lastname} a commenté une section.`, `/editor/${project.userId}`)
  }

  res.status(201).json({ ...created, resolved: false, replies: [] })
})

router.put('/:id/resolve', async (req: Request, res: Response) => {
  const comment = await db.get('SELECT * FROM comments WHERE id = ?', req.params.id) as any
  if (!comment) { res.status(404).json({ error: 'Commentaire non trouvé' }); return }
  await db.run("UPDATE comments SET resolved = 1, resolvedAt = NOW() WHERE id = ?", req.params.id)
  res.json({ success: true })
})

router.post('/:id/replies', async (req: Request, res: Response) => {
  const parsed = replySchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Données invalides', details: parsed.error.issues }); return }
  const comment = await db.get('SELECT * FROM comments WHERE id = ?', req.params.id) as any
  if (!comment) { res.status(404).json({ error: 'Commentaire non trouvé' }); return }
  const user = await db.get('SELECT id, firstname, lastname, avatar FROM users WHERE id = ?', req.user!.userId) as any
  const id = crypto.randomUUID()
  const { audioUrl } = parsed.data
  await db.run(`
    INSERT INTO comment_replies (id, commentId, userId, userName, avatar, content, audioUrl)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, id, req.params.id, req.user!.userId, `${user.firstname} ${user.lastname}`, user.avatar || '', parsed.data.content, audioUrl || '')
  const created = await db.get('SELECT * FROM comment_replies WHERE id = ?', id)
  res.status(201).json(created)
})

export default router
