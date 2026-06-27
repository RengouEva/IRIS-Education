import { Router, Request, Response } from 'express'
import db from '../database.js'
import crypto from 'crypto'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()
router.use(authMiddleware)

router.get('/messages/:projectId', async (req: Request, res: Response) => {
  const project = await db.get('SELECT * FROM projects WHERE id = ?', req.params.projectId as string) as any
  if (!project || project.userId !== req.user!.userId) {
    res.status(404).json({ error: 'Projet non trouvé' })
    return
  }
  const messages = await db.all('SELECT * FROM ai_messages WHERE projectId = ? ORDER BY timestamp ASC', req.params.projectId as string)
  res.json(messages)
})

router.post('/chat', async (req: Request, res: Response) => {
  const { projectId, message } = req.body
  if (!projectId || !message) {
    res.status(400).json({ error: 'projectId et message requis' })
    return
  }
  const project = await db.get('SELECT * FROM projects WHERE id = ?', projectId) as any
  if (!project || project.userId !== req.user!.userId) {
    res.status(404).json({ error: 'Projet non trouvé' })
    return
  }
  const userMsgId = crypto.randomUUID()
  await db.run('INSERT INTO ai_messages (id, projectId, role, content) VALUES (?, ?, ?, ?)', userMsgId, projectId, 'user', message)
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    const fallbackId = crypto.randomUUID()
    await db.run('INSERT INTO ai_messages (id, projectId, role, content) VALUES (?, ?, ?, ?)', fallbackId, projectId, 'assistant', "L'assistant IA n'est pas configuré. Veuillez configurer une clé API OpenRouter dans les paramètres du serveur.")
    const msgs = await db.all('SELECT * FROM ai_messages WHERE projectId = ? ORDER BY timestamp ASC', projectId)
    res.json({ messages: msgs })
    return
  }
  const history = await db.all('SELECT role, content FROM ai_messages WHERE projectId = ? ORDER BY timestamp ASC', projectId)
  const model = process.env.AI_MODEL || 'openai/gpt-4o'
  try {
    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Tu es un assistant académique spécialisé dans la rédaction de mémoires et thèses universitaires. Tu aides à la rédaction, la correction et l\'amélioration des travaux académiques.' },
          ...history.map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        ],
      }),
    })
    const data = await aiRes.json()
    const reply = data.choices?.[0]?.message?.content || 'Pas de réponse'
    const aiMsgId = crypto.randomUUID()
    await db.run('INSERT INTO ai_messages (id, projectId, role, content) VALUES (?, ?, ?, ?)', aiMsgId, projectId, 'assistant', reply)
    const msgs = await db.all('SELECT * FROM ai_messages WHERE projectId = ? ORDER BY timestamp ASC', projectId)
    res.json({ messages: msgs })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
