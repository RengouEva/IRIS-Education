import { Router, Request, Response } from 'express'
import db from '../database'
import { authMiddleware, adminMiddleware } from '../middleware/auth'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const router = Router()
router.use(authMiddleware)
router.use(adminMiddleware)

router.get('/stats', async (_req: Request, res: Response) => {
  const usersCount = (await db.get('SELECT COUNT(*) as count FROM users')).count
  const projectsCount = (await db.get('SELECT COUNT(*) as count FROM projects')).count
  const templatesCount = (await db.get('SELECT COUNT(*) as count FROM templates')).count
  const commentsCount = (await db.get('SELECT COUNT(*) as count FROM comments')).count
  const studentsCount = (await db.get("SELECT COUNT(*) as count FROM users WHERE role = 'student'")).count
  const supervisorsCount = (await db.get("SELECT COUNT(*) as count FROM users WHERE role = 'supervisor'")).count
  const projectsByLevel = await db.all('SELECT level, COUNT(*) as count FROM projects GROUP BY level')
  const recentProjects = await db.all(`
    SELECT p.*, u.firstname || ' ' || u.lastname as studentName
    FROM projects p JOIN users u ON u.id = p.userId
    ORDER BY p.createdAt DESC LIMIT 5
  `)
  res.json({ usersCount, projectsCount, templatesCount, commentsCount, studentsCount, supervisorsCount, projectsByLevel, recentProjects })
})

router.get('/users', async (_req: Request, res: Response) => {
  const users = await db.all('SELECT id, firstname, lastname, email, role, avatar, universityId, createdAt FROM users ORDER BY createdAt DESC')
  res.json(users)
})

router.put('/users/:id', async (req: Request, res: Response) => {
  const user = await db.get('SELECT * FROM users WHERE id = ?', req.params.id) as any
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
    await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, ...values)
  }
  const updated = await db.get('SELECT id, firstname, lastname, email, role, avatar, universityId, createdAt FROM users WHERE id = ?', req.params.id)
  res.json(updated)
})

router.delete('/users/:id', async (req: Request, res: Response) => {
  const user = await db.get('SELECT * FROM users WHERE id = ?', req.params.id) as any
  if (!user) { res.status(404).json({ error: 'Utilisateur non trouvé' }); return }
  if (user.role === 'admin') { res.status(403).json({ error: 'Impossible de supprimer un administrateur' }); return }
  await db.run('DELETE FROM users WHERE id = ?', req.params.id)
  res.json({ success: true })
})

router.post('/users', async (req: Request, res: Response) => {
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
  const existing = await db.get('SELECT id FROM users WHERE email = ?', email) as any
  if (existing) { res.status(409).json({ error: 'Cet email existe déjà' }); return }
  const id = crypto.randomUUID()
  await db.run('INSERT INTO users (id, firstname, lastname, email, password, role, universityId) VALUES (?, ?, ?, ?, ?, ?, ?)',
    id, firstname, lastname, email, bcrypt.hashSync(password, 10), role, universityId || null)
  const created = await db.get('SELECT id, firstname, lastname, email, role, avatar, universityId, createdAt FROM users WHERE id = ?', id)
  res.status(201).json(created)
})

router.get('/config', async (_req: Request, res: Response) => {
  const config = await db.all('SELECT * FROM app_config')
  const result: Record<string, string> = {}
  for (const c of config as any[]) result[c.key] = c.value
  res.json(result)
})

router.put('/config', async (req: Request, res: Response) => {
  const body = req.body as Record<string, string>
  for (const [key, value] of Object.entries(body)) {
    await db.run('INSERT INTO app_config (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', key, String(value))
  }
  const config = await db.all('SELECT * FROM app_config')
  const result: Record<string, string> = {}
  for (const c of config as any[]) result[c.key] = c.value
  res.json(result)
})

router.get('/universities', async (_req: Request, res: Response) => {
  const universities = await db.all('SELECT * FROM universities ORDER BY name')
  res.json(universities)
})

router.post('/universities', async (req: Request, res: Response) => {
  const schema = z.object({ name: z.string().min(1), country: z.string().default(''), logo: z.string().optional(), cover_config: z.string().optional() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Données invalides', details: parsed.error.issues }); return }
  const id = crypto.randomUUID()
  await db.run('INSERT INTO universities (id, name, country, logo, cover_config) VALUES (?, ?, ?, ?, ?)',
    id, parsed.data.name, parsed.data.country, parsed.data.logo || '', parsed.data.cover_config || '{}')
  const created = await db.get('SELECT * FROM universities WHERE id = ?', id)
  res.status(201).json(created)
})

router.put('/universities/:id', async (req: Request, res: Response) => {
  const uni = await db.get('SELECT * FROM universities WHERE id = ?', req.params.id) as any
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
    await db.run(`UPDATE universities SET ${updates.join(', ')} WHERE id = ?`, ...values)
  }
  const updated = await db.get('SELECT * FROM universities WHERE id = ?', req.params.id)
  res.json(updated)
})

router.delete('/universities/:id', async (req: Request, res: Response) => {
  const uni = await db.get('SELECT * FROM universities WHERE id = ?', req.params.id) as any
  if (!uni) { res.status(404).json({ error: 'Université non trouvée' }); return }
  await db.run('DELETE FROM universities WHERE id = ?', req.params.id)
  res.json({ success: true })
})

router.get('/projects', async (_req: Request, res: Response) => {
  const projects = await db.all(`
    SELECT p.*, u.firstname || ' ' || u.lastname as studentName
    FROM projects p
    JOIN users u ON u.id = p.userId
    ORDER BY p.createdAt DESC
  `)
  res.json(projects)
})

router.delete('/projects/:id', async (req: Request, res: Response) => {
  const project = await db.get('SELECT * FROM projects WHERE id = ?', req.params.id) as any
  if (!project) { res.status(404).json({ error: 'Projet non trouvé' }); return }
  await db.run('DELETE FROM projects WHERE id = ?', req.params.id)
  res.json({ success: true })
})

export default router
