import { Router, Request, Response } from 'express'
import { z } from 'zod'
import db from '../database.js'
import { authMiddleware } from '../middleware/auth.js'
import crypto from 'crypto'

const router = Router()
router.use(authMiddleware)

const versionSchema = z.object({
  projectId: z.string(),
  label: z.string().min(1),
  description: z.string().optional(),
  sections: z.array(z.object({ id: z.string(), content: z.string() })),
})

router.get('/', async (req: Request, res: Response) => {
  const { projectId } = req.query
  if (!projectId) { res.status(400).json({ error: 'projectId requis' }); return }
  const versions = await db.all('SELECT * FROM versions WHERE projectId = ? ORDER BY createdAt DESC', projectId as string)
  res.json(versions)
})

router.post('/', async (req: Request, res: Response) => {
  const parsed = versionSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Données invalides', details: parsed.error.issues }); return }
  const { projectId, label, description, sections } = parsed.data
  const project = await db.get('SELECT * FROM projects WHERE id = ?', projectId) as any
  if (!project || project.userId !== req.user!.userId) { res.status(404).json({ error: 'Projet non trouvé' }); return }
  const id = crypto.randomUUID()
  await db.run('INSERT INTO versions (id, projectId, label, description) VALUES (?, ?, ?, ?)',
    id, projectId, label, description || '')
  for (const section of sections) {
    await db.run('INSERT INTO version_sections (id, versionId, sectionId, content) VALUES (?, ?, ?, ?)',
      crypto.randomUUID(), id, section.id, section.content)
  }
  const created = await db.get('SELECT * FROM versions WHERE id = ?', id)
  res.status(201).json(created)
})

router.post('/:id/restore', async (req: Request, res: Response) => {
  const version = await db.get('SELECT * FROM versions WHERE id = ?', req.params.id) as any
  if (!version) { res.status(404).json({ error: 'Version non trouvée' }); return }
  const project = await db.get('SELECT * FROM projects WHERE id = ?', version.projectId) as any
  if (!project || project.userId !== req.user!.userId) { res.status(404).json({ error: 'Projet non trouvé' }); return }
  const versionSections = await db.all('SELECT * FROM version_sections WHERE versionId = ?', version.id) as any[]
  for (const vs of versionSections) {
    await db.run('UPDATE sections SET content = ? WHERE id = ? AND projectId = ?', vs.content, vs.sectionId, version.projectId)
  }
  await db.run("UPDATE projects SET lastModified = NOW() WHERE id = ?", version.projectId)
  res.json({ success: true, message: 'Version restaurée' })
})

export default router
