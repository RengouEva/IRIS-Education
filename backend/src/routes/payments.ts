import { Router, Request, Response } from 'express'
import db from '../database.js'
import { authMiddleware } from '../middleware/auth.js'
import { paymentProvider, generateReference } from '../payments.js'
import { sendPaymentConfirmationEmail } from '../email.js'
import crypto from 'crypto'

const router = Router()

router.get('/plans', async (_req: Request, res: Response) => {
  try {
    const plans = await db.all('SELECT * FROM subscriptions ORDER BY price')
    res.json(plans)
  } catch (err) {
    console.error('Plans error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/initiate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { planName, phone, provider } = req.body
    if (!planName || !phone) {
      res.status(400).json({ error: 'planName et phone requis' })
      return
    }

    const plan = await db.get('SELECT * FROM subscriptions WHERE name = ?', planName) as any
    if (!plan) {
      res.status(404).json({ error: 'Forfait non trouvé' })
      return
    }

    if (plan.price === 0) {
      await db.run(
        'UPDATE users SET subscriptionStatus = ?, subscriptionEndDate = ? WHERE id = ?',
        planName, new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000).toISOString(), req.user!.userId
      )
      res.json({ success: true, message: 'Forfait gratuit activé' })
      return
    }

    const reference = generateReference()
    const payProvider = paymentProvider.getProvider()
    const result = await payProvider.initiate(phone, plan.price, reference, `IRIS-Education ${planName}`)

    if (!result.success) {
      res.status(400).json({ error: result.message })
      return
    }

    await db.run(
      `INSERT INTO payments (id, userId, amount, currency, provider, status, transactionId, reference, planName, phone)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
      crypto.randomUUID(), req.user!.userId, plan.price, plan.currency, provider || 'unknown',
      result.transactionId || reference, reference, planName, phone
    )

    res.json({
      success: true,
      reference,
      transactionId: result.transactionId,
      message: result.message || 'Transaction initiée. Confirmez sur votre téléphone.',
    })
  } catch (err) {
    console.error('Initiate payment error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/confirm', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.body
    if (!transactionId) {
      res.status(400).json({ error: 'transactionId requis' })
      return
    }

    const payment = await db.get(
      'SELECT * FROM payments WHERE transactionId = ? AND userId = ?',
      transactionId, req.user!.userId
    ) as any

    if (!payment) {
      res.status(404).json({ error: 'Transaction non trouvée' })
      return
    }

    if (payment.status !== 'pending') {
      res.json({ status: payment.status, message: 'Transaction déjà traitée' })
      return
    }

    const payProvider = paymentProvider.getProvider()
    const result = await payProvider.confirm(transactionId)

    if (result.success && result.status === 'confirmed') {
      await db.run(
        'UPDATE payments SET status = ?, confirmedAt = NOW() WHERE id = ?',
        'confirmed', payment.id
      )

      const plan = await db.get('SELECT * FROM subscriptions WHERE name = ?', payment.planName) as any
      if (plan) {
        const endDate = new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000).toISOString()
        await db.run(
          'UPDATE users SET subscriptionStatus = ?, subscriptionEndDate = ? WHERE id = ?',
          payment.planName, endDate, req.user!.userId
        )
      }

      const user = await db.get('SELECT email, firstname FROM users WHERE id = ?', req.user!.userId) as any
      if (user) {
        await sendPaymentConfirmationEmail(user.email, user.firstname, payment.planName, String(payment.amount))
      }

      res.json({ success: true, status: 'confirmed', message: 'Paiement confirmé ! Votre abonnement est actif.' })
    } else {
      await db.run('UPDATE payments SET status = ? WHERE id = ?', result.status || 'failed', payment.id)
      res.status(400).json({ error: result.message || 'Échec de confirmation du paiement' })
    }
  } catch (err) {
    console.error('Confirm payment error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { transactionId, status, reference } = req.body
    if (!transactionId) {
      res.status(400).json({ error: 'transactionId requis' })
      return
    }

    const payment = await db.get('SELECT * FROM payments WHERE transactionId = ? OR reference = ?', transactionId, reference || '') as any
    if (!payment) {
      res.status(404).json({ error: 'Transaction non trouvée' })
      return
    }

    const newStatus = status === 'completed' || status === 'ACCEPTED' ? 'confirmed' : 'failed'
    if (newStatus === 'confirmed') {
      await db.run('UPDATE payments SET status = ?, confirmedAt = NOW() WHERE id = ?', 'confirmed', payment.id)
      const plan = await db.get('SELECT * FROM subscriptions WHERE name = ?', payment.planName) as any
      if (plan) {
        const endDate = new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000).toISOString()
        await db.run('UPDATE users SET subscriptionStatus = ?, subscriptionEndDate = ? WHERE id = ?', payment.planName, endDate, payment.userId)
      }
    } else {
      await db.run('UPDATE payments SET status = ? WHERE id = ?', 'failed', payment.id)
    }

    res.json({ received: true })
  } catch (err) {
    console.error('Webhook error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.get('/history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const payments = await db.all(
      'SELECT * FROM payments WHERE userId = ? ORDER BY createdAt DESC',
      req.user!.userId
    )
    res.json(payments)
  } catch (err) {
    console.error('History error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.get('/subscription', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await db.get(
      'SELECT subscriptionStatus, subscriptionEndDate FROM users WHERE id = ?',
      req.user!.userId
    ) as any
    if (!user) {
      res.status(404).json({ error: 'Utilisateur non trouvé' })
      return
    }

    const plan = await db.get('SELECT * FROM subscriptions WHERE name = ?', user.subscriptionStatus) as any

    const isActive = user.subscriptionStatus !== 'free' && user.subscriptionEndDate
      ? new Date(user.subscriptionEndDate) > new Date()
      : user.subscriptionStatus === 'free'

    res.json({
      plan: user.subscriptionStatus,
      endDate: user.subscriptionEndDate,
      active: isActive,
      features: plan?.features ? JSON.parse(plan.features) : {},
    })
  } catch (err) {
    console.error('Subscription error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
