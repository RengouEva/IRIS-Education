import { Router, Request, Response } from 'express'
import db from '../database'
import { authMiddleware, adminMiddleware } from '../middleware/auth'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const router = Router()
router.use(authMiddleware)
router.use(adminMiddleware)

router.get('/stats', (_req: Request, res: Response) => {
  const usersCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count
  const projectsCount = (db.prepare('SELECT COUNT(*) as count FROM projects').get() as any).count
  const templatesCount = (db.prepare('SELECT COUNT(*) as count FROM templates').get() as any).count
  const commentsCount = (db.prepare('SELECT COUNT(*) as count FROM comments').get() as any).count
  const studentsCount = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student'").get() as any).count
  const supervisorsCount = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'supervisor'").get() as any).count
  const projectsByLevel = db.prepare('SELECT level, COUNT(*) as count FROM projects GROUP BY level').all()
  const recentProjects = db.prepare(`
    SELECT p.*, u.firstname || ' ' || u.lastname as studentName
    FROM projects p JOIN users u ON u.id = p.userId
    ORDER BY p.createdAt DESC LIMIT 5
  `).all()
  res.json({ usersCount, projectsCount, templatesCount, commentsCount, studentsCount, supervisorsCount, projectsByLevel, recentProjects })
})

router.get('/users', (_req: Request, res: Response) => {
  const users = db.prepare('SELECT id, firstname, lastname, email, role, avatar, universityId, createdAt FROM users ORDER BY createdAt DESC').all()
  res.json(users)
})

router.put('/users/:id', (req: Request, res: Response) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any
  if (!user) { res.status(404).json({ error: 'Utilisateur non trouvé' }); return }
  const allowed = ['firstname', 'lastname', 'email', 'role', 'universityId']
  const updates: string[] = []
  const values: any[] = []
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates.push(`${key} = ?`)
      values.push(req.body[key])
    }
  }
  if (req.body.password) {
    updates.push('password = ?')
    values.push(bcrypt.hashSync(req.body.password, 10))
  }
  if (updates.length > 0) {
    values.push(req.params.id)
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  }
  const updated = db.prepare('SELECT id, firstname, lastname, email, role, avatar, universityId, createdAt FROM users WHERE id = ?').get(req.params.id)
  res.json(updated)
})

router.delete('/users/:id', (req: Request, res: Response) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any
  if (!user) { res.status(404).json({ error: 'Utilisateur non trouvé' }); return }
  if (user.role === 'admin') { res.status(403).json({ error: 'Impossible de supprimer un administrateur' }); return }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

router.post('/users', (req: Request, res: Response) => {
  const schema = z.object({
    firstname: z.string().min(1),
    lastname: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['student', 'supervisor', 'admin']).default('student'),
    universityId: z.string().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Données invalides', details: parsed.error.issues }); return }
  const { firstname, lastname, email, password, role, universityId } = parsed.data
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as any
  if (existing) { res.status(409).json({ error: 'Cet email existe déjà' }); return }
  const id = crypto.randomUUID()
  db.prepare('INSERT INTO users (id, firstname, lastname, email, password, role, universityId) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, firstname, lastname, email, bcrypt.hashSync(password, 10), role, universityId || null)
  const created = db.prepare('SELECT id, firstname, lastname, email, role, avatar, universityId, createdAt FROM users WHERE id = ?').get(id)
  res.status(201).json(created)
})

router.get('/config', (_req: Request, res: Response) => {
  const config = db.prepare('SELECT * FROM app_config').all()
  const result: Record<string, string> = {}
  for (const c of config as any[]) result[c.key] = c.value
  res.json(result)
})

router.put('/config', (req: Request, res: Response) => {
  const body = req.body as Record<string, string>
  const upsert = db.prepare('INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)')
  for (const [key, value] of Object.entries(body)) {
    upsert.run(key, String(value))
  }
  const config = db.prepare('SELECT * FROM app_config').all()
  const result: Record<string, string> = {}
  for (const c of config as any[]) result[c.key] = c.value
  res.json(result)
})

router.get('/universities', (_req: Request, res: Response) => {
  const universities = db.prepare('SELECT * FROM universities ORDER BY name').all()
  res.json(universities)
})

router.post('/universities', (req: Request, res: Response) => {
  const schema = z.object({ name: z.string().min(1), country: z.string().default(''), logo: z.string().optional(), cover_config: z.string().optional() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Données invalides', details: parsed.error.issues }); return }
  const id = crypto.randomUUID()
  db.prepare('INSERT INTO universities (id, name, country, logo, cover_config) VALUES (?, ?, ?, ?, ?)')
    .run(id, parsed.data.name, parsed.data.country, parsed.data.logo || '', parsed.data.cover_config || '{}')
  const created = db.prepare('SELECT * FROM universities WHERE id = ?').get(id)
  res.status(201).json(created)
})

router.put('/universities/:id', (req: Request, res: Response) => {
  const uni = db.prepare('SELECT * FROM universities WHERE id = ?').get(req.params.id) as any
  if (!uni) { res.status(404).json({ error: 'Université non trouvée' }); return }
  const allowed = ['name', 'country', 'logo', 'cover_config']
  const updates: string[] = []
  const values: any[] = []
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates.push(`${key} = ?`)
      values.push(req.body[key])
    }
  }
  if (updates.length > 0) {
    values.push(req.params.id)
    db.prepare(`UPDATE universities SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  }
  const updated = db.prepare('SELECT * FROM universities WHERE id = ?').get(req.params.id)
  res.json(updated)
})

router.delete('/universities/:id', (req: Request, res: Response) => {
  const uni = db.prepare('SELECT * FROM universities WHERE id = ?').get(req.params.id) as any
  if (!uni) { res.status(404).json({ error: 'Université non trouvée' }); return }
  db.prepare('DELETE FROM universities WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

router.get('/projects', (_req: Request, res: Response) => {
  const projects = db.prepare(`
    SELECT p.*, u.firstname || ' ' || u.lastname as studentName
    FROM projects p
    JOIN users u ON u.id = p.userId
    ORDER BY p.createdAt DESC
  `).all()
  res.json(projects)
})

router.delete('/projects/:id', (req: Request, res: Response) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as any
  if (!project) { res.status(404).json({ error: 'Projet non trouvé' }); return }
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

export default router
