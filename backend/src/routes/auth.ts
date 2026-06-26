import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import db from '../database'
import { generateToken, authMiddleware } from '../middleware/auth'
import crypto from 'crypto'

const router = Router()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const registerSchema = z.object({
  firstname: z.string().min(1),
  lastname: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['student', 'supervisor']).default('student'),
  universityId: z.string().optional(),
})

router.post('/login', (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Données invalides', details: parsed.error.issues })
    return
  }
  const { email, password } = parsed.data
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any
  if (!user || !bcrypt.compareSync(password, user.password)) {
    res.status(401).json({ error: 'Email ou mot de passe incorrect' })
    return
  }
  const token = generateToken({ userId: user.id, role: user.role })
  const { password: _, ...userData } = user
  res.json({ token, user: userData })
})

router.post('/register', (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Données invalides', details: parsed.error.issues })
    return
  }
  const { firstname, lastname, email, password, role, universityId } = parsed.data
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as any
  if (existing) {
    res.status(409).json({ error: 'Cet email est déjà utilisé' })
    return
  }
  const id = crypto.randomUUID()
  const hashed = bcrypt.hashSync(password, 10)
  db.prepare(
    'INSERT INTO users (id, firstname, lastname, email, password, role, universityId) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, firstname, lastname, email, hashed, role, universityId || null)
  const token = generateToken({ userId: id, role })
  res.status(201).json({
    token,
    user: { id, firstname, lastname, email, role, universityId, avatar: null },
  })
})

router.get('/me', authMiddleware, (req: Request, res: Response) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.userId) as any
  if (!user) {
    res.status(404).json({ error: 'Utilisateur non trouvé' })
    return
  }
  const { password: _, ...userData } = user
  res.json(userData)
})

const updateProfileSchema = z.object({
  firstname: z.string().min(1).optional(),
  lastname: z.string().min(1).optional(),
  email: z.string().email().optional(),
  universityId: z.string().optional(),
  avatar: z.string().optional(),
})

router.put('/me', authMiddleware, (req: Request, res: Response) => {
  const parsed = updateProfileSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Données invalides', details: parsed.error.issues })
    return
  }
  const allowed = ['firstname', 'lastname', 'email', 'universityId', 'avatar']
  const updates: string[] = []
  const values: any[] = []
  for (const key of allowed) {
    if (parsed.data[key as keyof typeof parsed.data] !== undefined) {
      updates.push(`${key} = ?`)
      values.push(parsed.data[key as keyof typeof parsed.data])
    }
  }
  if (updates.length > 0) {
    values.push(req.user!.userId)
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.userId) as any
  const { password: _, ...userData } = user
  res.json(userData)
})

export default router
