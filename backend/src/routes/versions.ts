import { Router, Request, Response } from 'express'
import { z } from 'zod'
import db from '../database'
import { authMiddleware } from '../middleware/auth'
import crypto from 'crypto'

const router = Router()
router.use(authMiddleware)

const versionSchema = z.object({
  projectId: z.string(),
  label: z.string().min(1),
  description: z.string().optional(),
  sections: z.array(z.object({ id: z.string(), content: z.string() })),
})

router.get('/', (req: Request, res: Response) => {
  const { projectId } = req.query
  if (!projectId) { res.status(400).json({ error: 'projectId requis' }); return }
  const versions = db.prepare('SELECT * FROM versions WHERE projectId = ? ORDER BY createdAt DESC').all(projectId as string)
  res.json(versions)
})

router.post('/', (req: Request, res: Response) => {
  const parsed = versionSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Données invalides', details: parsed.error.issues }); return }
  const { projectId, label, description, sections } = parsed.data
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any
  if (!project || project.userId !== req.user!.userId) { res.status(404).json({ error: 'Projet non trouvé' }); return }
  const id = crypto.randomUUID()
  db.prepare('INSERT INTO versions (id, projectId, label, description) VALUES (?, ?, ?, ?)')
    .run(id, projectId, label, description || '')
  for (const section of sections) {
    db.prepare('INSERT INTO version_sections (id, versionId, sectionId, content) VALUES (?, ?, ?, ?)')
      .run(crypto.randomUUID(), id, section.id, section.content)
  }
  const created = db.prepare('SELECT * FROM versions WHERE id = ?').get(id)
  res.status(201).json(created)
})

router.post('/:id/restore', (req: Request, res: Response) => {
  const version = db.prepare('SELECT * FROM versions WHERE id = ?').get(req.params.id) as any
  if (!version) { res.status(404).json({ error: 'Version non trouvée' }); return }
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(version.projectId) as any
  if (!project || project.userId !== req.user!.userId) { res.status(404).json({ error: 'Projet non trouvé' }); return }
  const versionSections = db.prepare('SELECT * FROM version_sections WHERE versionId = ?').all(version.id) as any[]
  const updateStmt = db.prepare('UPDATE sections SET content = ? WHERE id = ? AND projectId = ?')
  for (const vs of versionSections) {
    updateStmt.run(vs.content, vs.sectionId, version.projectId)
  }
  db.prepare("UPDATE projects SET lastModified = datetime('now') WHERE id = ?").run(version.projectId)
  res.json({ success: true, message: 'Version restaurée' })
})

export default router
