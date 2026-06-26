import { Router, Request, Response } from 'express'
import { z } from 'zod'
import db from '../database'
import { authMiddleware } from '../middleware/auth'
import crypto from 'crypto'

const router = Router()
router.use(authMiddleware)

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''
const AI_MODEL = process.env.AI_MODEL || 'openai/gpt-4o'

const chatSchema = z.object({
  projectId: z.string(),
  message: z.string().min(1),
})

router.get('/messages', (req: Request, res: Response) => {
  const { projectId } = req.query
  if (!projectId) { res.status(400).json({ error: 'projectId requis' }); return }
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId as string) as any
  if (!project || project.userId !== req.user!.userId) { res.status(404).json({ error: 'Projet non trouvé' }); return }
  const messages = db.prepare('SELECT * FROM ai_messages WHERE projectId = ? ORDER BY timestamp ASC').all(projectId as string)
  res.json(messages)
})

router.post('/chat', async (req: Request, res: Response) => {
  const parsed = chatSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Données invalides', details: parsed.error.issues }); return }

  const { projectId, message } = parsed.data
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any
  if (!project || project.userId !== req.user!.userId) { res.status(404).json({ error: 'Projet non trouvé' }); return }

  const sections = db.prepare('SELECT title, type, content FROM sections WHERE projectId = ? ORDER BY orderIndex ASC').all(projectId) as any[]
  const history = db.prepare('SELECT * FROM ai_messages WHERE projectId = ? ORDER BY timestamp ASC').all(projectId) as any[]

  const userMsgId = crypto.randomUUID()
  db.prepare('INSERT INTO ai_messages (id, projectId, role, content) VALUES (?, ?, ?, ?)').run(userMsgId, projectId, 'user', message)

  const systemPrompt = `Tu es un assistant académique spécialisé dans l'aide à la rédaction de mémoires, thèses et rapports de stage.

Contexte du projet :
- Titre : ${project.title}
- Thème : ${project.theme || 'Non défini'}
- Niveau : ${project.level}
- Faculté : ${project.faculty || 'Non défini'}
- Encadreur : ${project.supervisor || 'Non défini'}
- Année académique : ${project.academicYear || 'Non défini'}

Sections du document :
${sections.map(s => `[${s.type.toUpperCase()}] ${s.title}\n${s.content ? s.content.substring(0, 500) : '(vide)'}`).join('\n\n')}

Ton rôle :
- Aider l'étudiant à améliorer son contenu académique
- Suggérer des reformulations, des corrections et des améliorations
- Proposer des problématiques, des plans, des arguments
- Donner des conseils bibliographiques
- Répondre en français académique
- Être précis et concis`

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map((m: any) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ]

  if (!OPENROUTER_API_KEY) {
    const fallbackId = crypto.randomUUID()
    const fallbackContent = 'Désolé, l\'assistant IA n\'est pas configuré. Veuillez configurer une clé API OpenRouter dans le fichier .env (OPENROUTER_API_KEY).'
    db.prepare('INSERT INTO ai_messages (id, projectId, role, content) VALUES (?, ?, ?, ?)').run(fallbackId, projectId, 'assistant', fallbackContent)
    res.json({ id: fallbackId, projectId, role: 'assistant', content: fallbackContent, timestamp: new Date().toISOString() })
    return
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'IRIS-Education',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages,
        max_tokens: 2048,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errBody = await response.text()
      console.error('OpenRouter error:', response.status, errBody)
      res.status(502).json({ error: `Erreur API IA (${response.status})` })
      return
    }

    const data = await response.json() as any
    const assistantContent = data.choices?.[0]?.message?.content || 'Pas de réponse générée.'

    const assistantId = crypto.randomUUID()
    db.prepare('INSERT INTO ai_messages (id, projectId, role, content) VALUES (?, ?, ?, ?)').run(assistantId, projectId, 'assistant', assistantContent)

    res.json({ id: assistantId, projectId, role: 'assistant', content: assistantContent, timestamp: new Date().toISOString() })
  } catch (err: any) {
    console.error('AI request failed:', err)
    res.status(502).json({ error: 'Impossible de contacter le service IA.' })
  }
})

export default router
