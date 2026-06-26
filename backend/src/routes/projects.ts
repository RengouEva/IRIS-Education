import { Router, Request, Response } from 'express'
import { z } from 'zod'
import db from '../database'
import { authMiddleware } from '../middleware/auth'
import crypto from 'crypto'

const router = Router()
router.use(authMiddleware)

const projectSchema = z.object({
  title: z.string().min(1),
  theme: z.string().default(''),
  field: z.string().default(''),
  level: z.enum(['licence', 'master', 'doctorat', 'stage']),
  academicYear: z.string().default(''),
  supervisor: z.string().default(''),
  universityId: z.string().optional(),
  faculty: z.string().default(''),
  cover_fields: z.string().default('{}'),
  templateId: z.string().optional(),
})

function canAccess(projectId: string, userId: string): any {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any
  if (!project) return null
  if (project.userId === userId) return project
  const collab = db.prepare('SELECT * FROM project_collaborators WHERE projectId = ? AND userId = ? AND status = ?').get(projectId, userId, 'accepted') as any
  return collab ? project : null
}

router.get('/', (req: Request, res: Response) => {
  const owned = db.prepare('SELECT * FROM projects WHERE userId = ? ORDER BY lastModified DESC').all(req.user!.userId) as any[]
  const shared = db.prepare(`
    SELECT p.* FROM projects p
    JOIN project_collaborators pc ON pc.projectId = p.id
    WHERE pc.userId = ? AND pc.status = 'accepted'
    ORDER BY p.lastModified DESC
  `).all(req.user!.userId) as any[]
  const allIds = new Set<string>()
  const combined = [...owned, ...shared].filter((p) => {
    if (allIds.has(p.id)) return false
    allIds.add(p.id)
    return true
  })
  res.json(combined.map((p: any) => ({
    ...p,
    sections: db.prepare('SELECT * FROM sections WHERE projectId = ? ORDER BY orderIndex').all(p.id),
    bibliography: db.prepare(`
      SELECT r.*, GROUP_CONCAT(ra.firstname || ' ' || ra.lastname, ', ') as authorsStr
      FROM references_table r
      LEFT JOIN reference_authors ra ON ra.referenceId = r.id
      WHERE r.projectId = ?
      GROUP BY r.id
    `).all(p.id),
  })))
})

router.get('/all', (req: Request, res: Response) => {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user!.userId) as any
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Accès refusé' })
    return
  }
  const projects = db.prepare(`
    SELECT p.*, u.firstname || ' ' || u.lastname as studentName
    FROM projects p
    JOIN users u ON u.id = p.userId
    ORDER BY p.lastModified DESC
  `).all() as any[]
  res.json(projects)
})

router.get('/:id', (req: Request, res: Response) => {
  const project = canAccess(req.params.id as string, req.user!.userId)
  if (!project) {
    res.status(404).json({ error: 'Projet non trouvé' })
    return
  }
  project.sections = db.prepare('SELECT * FROM sections WHERE projectId = ? ORDER BY orderIndex').all(project.id)
  project.subsections = db.prepare(`
    SELECT ss.* FROM subsections ss
    JOIN sections s ON s.id = ss.sectionId
    WHERE s.projectId = ?
    ORDER BY ss.orderIndex
  `).all(project.id)
  project.bibliography = db.prepare(`
    SELECT r.*, GROUP_CONCAT(ra.firstname || ' ' || ra.lastname, ', ') as authorsStr
    FROM references_table r
    LEFT JOIN reference_authors ra ON ra.referenceId = r.id
    WHERE r.projectId = ?
    GROUP BY r.id
  `).all(project.id)
  project.comments = db.prepare(`
    SELECT c.* FROM comments c
    JOIN sections s ON s.id = c.sectionId
    WHERE s.projectId = ?
    ORDER BY c.createdAt DESC
  `).all(project.id)
  project.versions = db.prepare('SELECT * FROM versions WHERE projectId = ? ORDER BY createdAt DESC').all(project.id)
  res.json(project)
})

router.post('/', (req: Request, res: Response) => {
  const parsed = projectSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Données invalides', details: parsed.error.issues })
    return
  }
  const { title, theme, field, level, academicYear, supervisor, universityId, faculty, cover_fields, templateId } = parsed.data
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO projects (id, userId, title, theme, field, level, academicYear, supervisor, universityId, faculty, cover_fields, lastModified)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.user!.userId, title, theme, field, level, academicYear, supervisor, universityId || null, faculty, cover_fields, now)

  if (templateId) {
    const defaultSections = db.prepare('SELECT * FROM template_default_sections WHERE templateId = ? ORDER BY orderIndex').all(templateId) as any[]
    for (const ds of defaultSections) {
      const sectionId = crypto.randomUUID()
      db.prepare('INSERT INTO sections (id, projectId, title, type, content, orderIndex) VALUES (?, ?, ?, ?, ?, ?)')
        .run(sectionId, id, ds.title, ds.type, '', ds.orderIndex)
      const subs = db.prepare('SELECT * FROM template_default_subsections WHERE defaultSectionId = ? ORDER BY orderIndex').all(ds.id) as any[]
      for (const sub of subs) {
        db.prepare('INSERT INTO subsections (id, sectionId, title, orderIndex) VALUES (?, ?, ?, ?)')
          .run(crypto.randomUUID(), sectionId, sub.title, sub.orderIndex)
      }
    }
  }

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any
  project.sections = db.prepare('SELECT * FROM sections WHERE projectId = ? ORDER BY orderIndex').all(id)
  res.status(201).json(project)
})

router.put('/:id', (req: Request, res: Response) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as any
  if (!project || project.userId !== req.user!.userId) {
    res.status(404).json({ error: 'Projet non trouvé' })
    return
  }
  const allowed = ['title', 'theme', 'field', 'level', 'academicYear', 'supervisor', 'universityId', 'faculty', 'cover_fields', 'status', 'progress']
  const updates: string[] = []
  const values: any[] = []
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates.push(`${key} = ?`)
      values.push(req.body[key])
    }
  }
  if (updates.length > 0) {
    updates.push("lastModified = datetime('now')")
    values.push(req.params.id)
    db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  }
  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id)
  res.json(updated)
})

router.delete('/:id', (req: Request, res: Response) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as any
  if (!project || project.userId !== req.user!.userId) {
    res.status(404).json({ error: 'Projet non trouvé' })
    return
  }
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

router.post('/:id/sections', (req: Request, res: Response) => {
  const project = canAccess(req.params.id as string, req.user!.userId)
  if (!project) {
    res.status(404).json({ error: 'Projet non trouvé' }); return
  }
  const { title, type } = req.body
  const sectionId = crypto.randomUUID()
  const maxOrder = db.prepare('SELECT MAX(orderIndex) as mx FROM sections WHERE projectId = ?').get(req.params.id) as any
  const orderIndex = (maxOrder?.mx ?? -1) + 1
  db.prepare('INSERT INTO sections (id, projectId, title, type, content, orderIndex) VALUES (?, ?, ?, ?, ?, ?)')
    .run(sectionId, req.params.id, title || 'Nouveau chapitre', type || 'chapter', '', orderIndex)
  db.prepare("UPDATE projects SET lastModified = datetime('now') WHERE id = ?").run(req.params.id)
  const created = db.prepare('SELECT * FROM sections WHERE id = ?').get(sectionId) as any
  res.status(201).json({ ...created, subsections: [] })
})

router.delete('/:id/sections/:sectionId', (req: Request, res: Response) => {
  const project = canAccess(req.params.id as string, req.user!.userId)
  if (!project) {
    res.status(404).json({ error: 'Projet non trouvé' }); return
  }
  const section = db.prepare('SELECT * FROM sections WHERE id = ? AND projectId = ?').get(req.params.sectionId, req.params.id) as any
  if (!section) {
    res.status(404).json({ error: 'Section non trouvée' }); return
  }
  db.prepare('DELETE FROM sections WHERE id = ?').run(req.params.sectionId)
  db.prepare("UPDATE projects SET lastModified = datetime('now') WHERE id = ?").run(req.params.id)
  res.json({ success: true })
})

router.put('/:id/sections/reorder', (req: Request, res: Response) => {
  const project = canAccess(req.params.id as string, req.user!.userId)
  if (!project) {
    res.status(404).json({ error: 'Projet non trouvé' }); return
  }
  const { order } = req.body
  if (!Array.isArray(order)) { res.status(400).json({ error: 'order doit être un tableau' }); return }
  const updateStmt = db.prepare('UPDATE sections SET orderIndex = ? WHERE id = ? AND projectId = ?')
  const txn = db.transaction(() => {
    for (const item of order) {
      updateStmt.run(item.orderIndex, item.id, req.params.id)
    }
    db.prepare("UPDATE projects SET lastModified = datetime('now') WHERE id = ?").run(req.params.id)
  })
  txn()
  res.json({ success: true })
})

router.put('/:id/sections/:sectionId', (req: Request, res: Response) => {
  const project = canAccess(req.params.id as string, req.user!.userId)
  if (!project) {
    res.status(404).json({ error: 'Projet non trouvé' })
    return
  }
  const section = db.prepare('SELECT * FROM sections WHERE id = ? AND projectId = ?').get(req.params.sectionId, req.params.id) as any
  if (!section) {
    res.status(404).json({ error: 'Section non trouvée' })
    return
  }
  const allowed = ['title', 'content', 'status', 'orderIndex']
  const updates: string[] = []
  const values: any[] = []
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates.push(`${key} = ?`)
      values.push(req.body[key])
    }
  }
  if (updates.length > 0) {
    values.push(req.params.sectionId)
    db.prepare(`UPDATE sections SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    db.prepare("UPDATE projects SET lastModified = datetime('now') WHERE id = ?").run(req.params.id)
  }
  const updated = db.prepare('SELECT * FROM sections WHERE id = ?').get(req.params.sectionId)
  res.json(updated)
})

export default router
