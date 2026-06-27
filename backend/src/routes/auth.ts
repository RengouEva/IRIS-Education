import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import db from '../database.js'
import { generateToken, authMiddleware } from '../middleware/auth.js'
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

router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Données invalides', details: parsed.error.issues })
      return
    }
    const { email, password } = parsed.data
    const user = await db.get('SELECT * FROM users WHERE email = ?', email) as any
    if (!user || !bcrypt.compareSync(password, user.password)) {
      res.status(401).json({ error: 'Email ou mot de passe incorrect' })
      return
    }
    const token = generateToken({ userId: user.id, role: user.role })
    const { password: _, ...userData } = user
    res.json({ token, user: userData })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Erreur serveur. Veuillez réessayer.' })
  }
})

router.post('/register', async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Données invalides', details: parsed.error.issues })
      return
    }
    const { firstname, lastname, email, password, role, universityId } = parsed.data
    const existing = await db.get('SELECT id FROM users WHERE email = ?', email) as any
    if (existing) {
      res.status(409).json({ error: 'Cet email est déjà utilisé' })
      return
    }
    const id = crypto.randomUUID()
    const hashed = bcrypt.hashSync(password, 10)
    await db.run(
      'INSERT INTO users (id, firstname, lastname, email, password, role, universityId) VALUES (?, ?, ?, ?, ?, ?, ?)',
      id, firstname, lastname, email, hashed, role, universityId || null
    )
    const token = generateToken({ userId: id, role })
    res.status(201).json({
      token,
      user: { id, firstname, lastname, email, role, universityId, avatar: null },
    })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: 'Erreur serveur. Veuillez réessayer.' })
  }
})

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', req.user!.userId) as any
    if (!user) {
      res.status(404).json({ error: 'Utilisateur non trouvé' })
      return
    }
    const { password: _, ...userData } = user
    res.json(userData)
  } catch (err) {
    console.error('Me error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

const updateProfileSchema = z.object({
  firstname: z.string().min(1).optional(),
  lastname: z.string().min(1).optional(),
  email: z.string().email().optional(),
  universityId: z.string().optional(),
  avatar: z.string().optional(),
})

router.put('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
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
      await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, ...values)
    }
    const user = await db.get('SELECT * FROM users WHERE id = ?', req.user!.userId) as any
    const { password: _, ...userData } = user
    res.json(userData)
  } catch (err) {
    console.error('Update profile error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
