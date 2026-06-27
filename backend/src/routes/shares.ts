import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import db from '../database.js'
import { authMiddleware } from '../middleware/auth.js'
import { createNotification } from './notifications.js'

const router = Router()

router.get('/:projectId', authMiddleware, async (req: Request, res: Response) => {
  const project = await db.get('SELECT * FROM projects WHERE id = ?', req.params.projectId as string) as any
  if (!project || project.userId !== req.user!.userId) {
    res.status(404).json({ error: 'Projet non trouvé' }); return
  }
  const shares = await db.all(`
    SELECT pc.*, u.firstname, u.lastname, u.avatar
    FROM project_collaborators pc
    LEFT JOIN users u ON pc.userId = u.id
    WHERE pc.projectId = ?
    ORDER BY pc.createdAt DESC
  `, req.params.projectId as string)
  res.json(shares)
})

router.post('/:projectId/invite', authMiddleware, async (req: Request, res: Response) => {
  const project = await db.get('SELECT * FROM projects WHERE id = ?', req.params.projectId as string) as any
  if (!project || project.userId !== req.user!.userId) {
    res.status(404).json({ error: 'Projet non trouvé' }); return
  }
  const { email, role } = req.body
  if (!email || !role) {
    res.status(400).json({ error: 'email et role requis' }); return
  }
  if (!['supervisor', 'student'].includes(role)) {
    res.status(400).json({ error: 'role invalide' }); return
  }
  const existing = await db.get('SELECT * FROM project_collaborators WHERE projectId = ? AND email = ?',
    req.params.projectId as string, email) as any
  if (existing) {
    res.status(400).json({ error: 'Cet utilisateur a déjà été invité' }); return
  }
  const token = crypto.randomBytes(24).toString('hex')
  const shareId = crypto.randomUUID()
  const invitedUser = await db.get('SELECT * FROM users WHERE email = ?', email) as any
  const userId = invitedUser?.id || null
  const owner = await db.get('SELECT * FROM users WHERE id = ?', req.user!.userId) as any
  await db.run('INSERT INTO project_collaborators (id, projectId, userId, email, role, token) VALUES (?, ?, ?, ?, ?, ?)',
    shareId, req.params.projectId as string, userId, email, role, token)
  if (invitedUser) {
    await createNotification(
      invitedUser.id,
      'share_invite',
      'Invitation à collaborer',
      `${owner.firstname} ${owner.lastname} vous a invité(e) comme ${role === 'supervisor' ? 'encadreur' : 'co-étudiant'} sur "${project.title}"`,
      '/dashboard'
    )
  }
  const created = await db.all(`
    SELECT pc.*, u.firstname, u.lastname, u.avatar
    FROM project_collaborators pc
    LEFT JOIN users u ON pc.userId = u.id
    WHERE pc.id = ?
  `, shareId)
  res.status(201).json(created[0])
})

router.put('/respond/:token', authMiddleware, async (req: Request, res: Response) => {
  const share = await db.get('SELECT * FROM project_collaborators WHERE token = ?', req.params.token as string) as any
  if (!share) {
    res.status(404).json({ error: 'Invitation non trouvée' }); return
  }
  const user = await db.get('SELECT * FROM users WHERE id = ?', req.user!.userId) as any
  if (user.email !== share.email) {
    res.status(403).json({ error: 'Cette invitation ne vous est pas destinée' }); return
  }
  const { action } = req.body
  if (!['accept', 'decline'].includes(action)) {
    res.status(400).json({ error: 'action doit être accept ou decline' }); return
  }
  const status = action === 'accept' ? 'accepted' : 'declined'
  await db.run('UPDATE project_collaborators SET status = ?, userId = ? WHERE id = ?',
    status, req.user!.userId, share.id)
  const project = await db.get('SELECT * FROM projects WHERE id = ?', share.projectId) as any
  if (project && action === 'accept') {
    await createNotification(
      project.userId,
      'share_accepted',
      'Invitation acceptée',
      `${user.firstname} ${user.lastname} a accepté votre invitation pour "${project.title}"`,
      `/editor/${project.id}`
    )
  }
  res.json({ success: true, status })
})

router.delete('/:shareId', authMiddleware, async (req: Request, res: Response) => {
  const share = await db.get(`
    SELECT pc.* FROM project_collaborators pc
    JOIN projects p ON p.id = pc.projectId
    WHERE pc.id = ? AND p.userId = ?
  `, req.params.shareId as string, req.user!.userId) as any
  if (!share) {
    res.status(404).json({ error: 'Invitation non trouvée' }); return
  }
  await db.run('DELETE FROM project_collaborators WHERE id = ?', req.params.shareId as string)
  res.json({ success: true })
})

export default router
