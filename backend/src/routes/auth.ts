import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import db from '../database.js'
import { generateToken, authMiddleware } from '../middleware/auth.js'
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail } from '../email.js'
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

const updateProfileSchema = z.object({
  firstname: z.string().min(1).optional(),
  lastname: z.string().min(1).optional(),
  email: z.string().email().optional(),
  universityId: z.string().optional(),
  avatar: z.string().optional(),
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
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    await db.run(
      `INSERT INTO users (id, firstname, lastname, email, password, role, universityId, emailVerified, verificationToken, verificationTokenExpires)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      id, firstname, lastname, email, hashed, role, universityId || null, verificationToken, expires
    )

    await sendVerificationEmail(email, verificationToken, firstname)

    res.status(201).json({
      message: 'Inscription réussie. Veuillez vérifier votre email pour activer votre compte.',
    })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: 'Erreur serveur. Veuillez réessayer.' })
  }
})

router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.body
    if (!token) {
      res.status(400).json({ error: 'Token requis' })
      return
    }

    const user = await db.get(
      'SELECT id, firstname, email, emailVerified FROM users WHERE verificationToken = ? AND verificationTokenExpires > NOW()',
      token
    ) as any

    if (!user) {
      res.status(400).json({ error: 'Token invalide ou expiré' })
      return
    }

    if (user.emailVerified) {
      res.json({ message: 'Email déjà vérifié. Vous pouvez vous connecter.' })
      return
    }

    await db.run(
      'UPDATE users SET emailVerified = 1, verificationToken = NULL, verificationTokenExpires = NULL WHERE id = ?',
      user.id
    )

    await sendWelcomeEmail(user.email, user.firstname)

    res.json({ message: 'Email vérifié avec succès. Vous pouvez maintenant vous connecter.' })
  } catch (err) {
    console.error('Verify email error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/resend-verification', async (req: Request, res: Response) => {
  try {
    const { email } = req.body
    if (!email) {
      res.status(400).json({ error: 'Email requis' })
      return
    }

    const user = await db.get('SELECT id, firstname, emailVerified FROM users WHERE email = ?', email) as any
    if (!user) {
      res.status(404).json({ error: 'Aucun compte trouvé avec cet email' })
      return
    }

    if (user.emailVerified) {
      res.json({ message: 'Email déjà vérifié' })
      return
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    await db.run('UPDATE users SET verificationToken = ?, verificationTokenExpires = ? WHERE id = ?', token, expires, user.id)
    await sendVerificationEmail(email, token, user.firstname)

    res.json({ message: 'Email de vérification renvoyé.' })
  } catch (err) {
    console.error('Resend verification error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
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

    if (!user.emailVerified) {
      const resendToken = crypto.randomBytes(32).toString('hex')
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      await db.run('UPDATE users SET verificationToken = ?, verificationTokenExpires = ? WHERE id = ?', resendToken, expires, user.id)
      await sendVerificationEmail(user.email, resendToken, user.firstname)
      res.status(403).json({
        error: 'Veuillez vérifier votre email avant de vous connecter.',
        needsVerification: true,
        message: 'Un nouveau lien de vérification vous a été envoyé.',
      })
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

router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body
    if (!email) {
      res.status(400).json({ error: 'Email requis' })
      return
    }

    const user = await db.get('SELECT id, firstname FROM users WHERE email = ?', email) as any
    if (!user) {
      res.status(200).json({ message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.' })
      return
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    await db.run('UPDATE users SET resetToken = ?, resetTokenExpires = ? WHERE id = ?', token, expires, user.id)
    await sendPasswordResetEmail(email, token, user.firstname)

    res.json({ message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.' })
  } catch (err) {
    console.error('Forgot password error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body
    if (!token || !password) {
      res.status(400).json({ error: 'Token et mot de passe requis' })
      return
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' })
      return
    }

    const user = await db.get(
      'SELECT id FROM users WHERE resetToken = ? AND resetTokenExpires > NOW()',
      token
    ) as any

    if (!user) {
      res.status(400).json({ error: 'Token invalide ou expiré' })
      return
    }

    const hashed = bcrypt.hashSync(password, 10)
    await db.run('UPDATE users SET password = ?, resetToken = NULL, resetTokenExpires = NULL WHERE id = ?', hashed, user.id)

    res.json({ message: 'Mot de passe réinitialisé avec succès.' })
  } catch (err) {
    console.error('Reset password error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
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
