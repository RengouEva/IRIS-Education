import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import db from '../database'
import { authMiddleware } from '../middleware/auth'
import { createNotification } from './notifications'

const router = Router()

router.get('/:projectId', authMiddleware, (req: Request, res: Response) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId) as any
  if (!project || project.userId !== req.user!.userId) {
    res.status(404).json({ error: 'Projet non trouvé' }); return
  }
  const shares = db.prepare(`
    SELECT pc.*, u.firstname, u.lastname, u.avatar
    FROM project_collaborators pc
    LEFT JOIN users u ON pc.userId = u.id
    WHERE pc.projectId = ?
    ORDER BY pc.createdAt DESC
  `).all(req.params.projectId)
  res.json(shares)
})

router.post('/:projectId/invite', authMiddleware, (req: Request, res: Response) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId) as any
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
  const existing = db.prepare('SELECT * FROM project_collaborators WHERE projectId = ? AND email = ?').get(req.params.projectId, email) as any
  if (existing) {
    res.status(400).json({ error: 'Cet utilisateur a déjà été invité' }); return
  }
  const token = crypto.randomBytes(24).toString('hex')
  const shareId = crypto.randomUUID()
  const invitedUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any
  const userId = invitedUser?.id || null
  const owner = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.userId) as any
  db.prepare('INSERT INTO project_collaborators (id, projectId, userId, email, role, token) VALUES (?, ?, ?, ?, ?, ?)')
    .run(shareId, req.params.projectId, userId, email, role, token)
  if (invitedUser) {
    createNotification(
      invitedUser.id,
      'share_invite',
      `Invitation à collaborer`,
      `${owner.firstname} ${owner.lastname} vous a invité(e) comme ${role === 'supervisor' ? 'encadreur' : 'co-étudiant'} sur "${project.title}"`,
      '/dashboard'
    )
  }
  const created = db.prepare(`
    SELECT pc.*, u.firstname, u.lastname, u.avatar
    FROM project_collaborators pc
    LEFT JOIN users u ON pc.userId = u.id
    WHERE pc.id = ?
  `).get(shareId)
  res.status(201).json(created)
})

router.put('/respond/:token', authMiddleware, (req: Request, res: Response) => {
  const share = db.prepare('SELECT * FROM project_collaborators WHERE token = ?').get(req.params.token) as any
  if (!share) {
    res.status(404).json({ error: 'Invitation non trouvée' }); return
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.userId) as any
  if (user.email !== share.email) {
    res.status(403).json({ error: 'Cette invitation ne vous est pas destinée' }); return
  }
  const { action } = req.body
  if (!['accept', 'decline'].includes(action)) {
    res.status(400).json({ error: 'action doit être accept ou decline' }); return
  }
  const status = action === 'accept' ? 'accepted' : 'declined'
  db.prepare('UPDATE project_collaborators SET status = ?, userId = ? WHERE id = ?')
    .run(status, req.user!.userId, share.id)
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(share.projectId) as any
  if (project && action === 'accept') {
    createNotification(
      project.userId,
      'share_accepted',
      `Invitation acceptée`,
      `${user.firstname} ${user.lastname} a accepté votre invitation pour "${project.title}"`,
      `/editor/${project.id}`
    )
  }
  res.json({ success: true, status })
})

router.delete('/:shareId', authMiddleware, (req: Request, res: Response) => {
  const share = db.prepare(`
    SELECT pc.* FROM project_collaborators pc
    JOIN projects p ON p.id = pc.projectId
    WHERE pc.id = ? AND p.userId = ?
  `).get(req.params.shareId, req.user!.userId) as any
  if (!share) {
    res.status(404).json({ error: 'Invitation non trouvée' }); return
  }
  db.prepare('DELETE FROM project_collaborators WHERE id = ?').run(req.params.shareId)
  res.json({ success: true })
})

export default router
