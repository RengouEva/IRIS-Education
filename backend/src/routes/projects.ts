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

async function canAccess(projectId: string, userId: string): Promise<any> {
  const project = await db.get('SELECT * FROM projects WHERE id = ?', projectId) as any
  if (!project) return null
  if (project.userId === userId) return project
  const collab = await db.get('SELECT * FROM project_collaborators WHERE projectId = ? AND userId = ? AND status = ?', projectId, userId, 'accepted') as any
  return collab ? project : null
}

router.get('/', async (req: Request, res: Response) => {
  const owned = await db.all('SELECT * FROM projects WHERE userId = ? ORDER BY lastModified DESC', req.user!.userId) as any[]
  const shared = await db.all(`
    SELECT p.* FROM projects p
    JOIN project_collaborators pc ON pc.projectId = p.id
    WHERE pc.userId = ? AND pc.status = 'accepted'
    ORDER BY p.lastModified DESC
  `, req.user!.userId) as any[]
  const allIds = new Set<string>()
  const combined = [...owned, ...shared].filter((p) => {
    if (allIds.has(p.id)) return false
    allIds.add(p.id)
    return true
  })
  res.json(await Promise.all(combined.map(async (p: any) => ({
    ...p,
    sections: await db.all('SELECT * FROM sections WHERE projectId = ? ORDER BY orderIndex', p.id),
    bibliography: await db.all(`
      SELECT r.*, STRING_AGG(ra.firstname || ' ' || ra.lastname, ', ') as "authorsStr"
      FROM references_table r
      LEFT JOIN reference_authors ra ON ra.referenceId = r.id
      WHERE r.projectId = ?
      GROUP BY r.id
    `, p.id),
  }))))
})

router.get('/all', async (req: Request, res: Response) => {
  const user = await db.get('SELECT role FROM users WHERE id = ?', req.user!.userId) as any
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Accès refusé' })
    return
  }
  const projects = await db.all(`
    SELECT p.*, u.firstname || ' ' || u.lastname as studentName
    FROM projects p
    JOIN users u ON u.id = p.userId
    ORDER BY p.lastModified DESC
  `) as any[]
  res.json(projects)
})

router.get('/:id', async (req: Request, res: Response) => {
  const project = await canAccess(req.params.id as string, req.user!.userId)
  if (!project) {
    res.status(404).json({ error: 'Projet non trouvé' })
    return
  }
  project.sections = await db.all('SELECT * FROM sections WHERE projectId = ? ORDER BY orderIndex', project.id)
  project.subsections = await db.all(`
    SELECT ss.* FROM subsections ss
    JOIN sections s ON s.id = ss.sectionId
    WHERE s.projectId = ?
    ORDER BY ss.orderIndex
  `, project.id)
  project.bibliography = await db.all(`
    SELECT r.*, STRING_AGG(ra.firstname || ' ' || ra.lastname, ', ') as "authorsStr"
    FROM references_table r
    LEFT JOIN reference_authors ra ON ra.referenceId = r.id
    WHERE r.projectId = ?
    GROUP BY r.id
  `, project.id)
  project.comments = await db.all(`
    SELECT c.* FROM comments c
    JOIN sections s ON s.id = c.sectionId
    WHERE s.projectId = ?
    ORDER BY c.createdAt DESC
  `, project.id)
  project.versions = await db.all('SELECT * FROM versions WHERE projectId = ? ORDER BY createdAt DESC', project.id)
  res.json(project)
})

router.post('/', async (req: Request, res: Response) => {
  const parsed = projectSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Données invalides', details: parsed.error.issues })
    return
  }
  const { title, theme, field, level, academicYear, supervisor, universityId, faculty, cover_fields, templateId } = parsed.data
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await db.run(`
    INSERT INTO projects (id, userId, title, theme, field, level, academicYear, supervisor, universityId, faculty, cover_fields, lastModified)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, id, req.user!.userId, title, theme, field, level, academicYear, supervisor, universityId || null, faculty, cover_fields, now)

  if (templateId) {
    const defaultSections = await db.all('SELECT * FROM template_default_sections WHERE templateId = ? ORDER BY orderIndex', templateId) as any[]
    for (const ds of defaultSections) {
      const sectionId = crypto.randomUUID()
      await db.run('INSERT INTO sections (id, projectId, title, type, content, orderIndex) VALUES (?, ?, ?, ?, ?, ?)',
        sectionId, id, ds.title, ds.type, '', ds.orderIndex)
      const subs = await db.all('SELECT * FROM template_default_subsections WHERE defaultSectionId = ? ORDER BY orderIndex', ds.id) as any[]
      for (const sub of subs) {
        await db.run('INSERT INTO subsections (id, sectionId, title, orderIndex) VALUES (?, ?, ?, ?)',
          crypto.randomUUID(), sectionId, sub.title, sub.orderIndex)
      }
    }
  }

  const project = await db.get('SELECT * FROM projects WHERE id = ?', id) as any
  project.sections = await db.all('SELECT * FROM sections WHERE projectId = ? ORDER BY orderIndex', id)
  res.status(201).json(project)
})

router.put('/:id', async (req: Request, res: Response) => {
  const project = await db.get('SELECT * FROM projects WHERE id = ?', req.params.id) as any
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
    updates.push("lastModified = NOW()")
    values.push(req.params.id)
    await db.run(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`, ...values)
  }
  const updated = await db.get('SELECT * FROM projects WHERE id = ?', req.params.id)
  res.json(updated)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const project = await db.get('SELECT * FROM projects WHERE id = ?', req.params.id) as any
  if (!project || project.userId !== req.user!.userId) {
    res.status(404).json({ error: 'Projet non trouvé' })
    return
  }
  await db.run('DELETE FROM projects WHERE id = ?', req.params.id)
  res.json({ success: true })
})

router.post('/:id/sections', async (req: Request, res: Response) => {
  const project = await canAccess(req.params.id as string, req.user!.userId)
  if (!project) {
    res.status(404).json({ error: 'Projet non trouvé' }); return
  }
  const { title, type } = req.body
  const sectionId = crypto.randomUUID()
  const maxOrder = await db.get('SELECT MAX(orderIndex) as mx FROM sections WHERE projectId = ?', req.params.id) as any
  const orderIndex = (maxOrder?.mx ?? -1) + 1
  await db.run('INSERT INTO sections (id, projectId, title, type, content, orderIndex) VALUES (?, ?, ?, ?, ?, ?)',
    sectionId, req.params.id, title || 'Nouveau chapitre', type || 'chapter', '', orderIndex)
  await db.run("UPDATE projects SET lastModified = NOW() WHERE id = ?", req.params.id)
  const created = await db.get('SELECT * FROM sections WHERE id = ?', sectionId) as any
  res.status(201).json({ ...created, subsections: [] })
})

router.delete('/:id/sections/:sectionId', async (req: Request, res: Response) => {
  const project = await canAccess(req.params.id as string, req.user!.userId)
  if (!project) {
    res.status(404).json({ error: 'Projet non trouvé' }); return
  }
  const section = await db.get('SELECT * FROM sections WHERE id = ? AND projectId = ?', req.params.sectionId, req.params.id) as any
  if (!section) {
    res.status(404).json({ error: 'Section non trouvée' }); return
  }
  await db.run('DELETE FROM sections WHERE id = ?', req.params.sectionId)
  await db.run("UPDATE projects SET lastModified = NOW() WHERE id = ?", req.params.id)
  res.json({ success: true })
})

router.put('/:id/sections/reorder', async (req: Request, res: Response) => {
  const project = await canAccess(req.params.id as string, req.user!.userId)
  if (!project) {
    res.status(404).json({ error: 'Projet non trouvé' }); return
  }
  const { order } = req.body
  if (!Array.isArray(order)) { res.status(400).json({ error: 'order doit être un tableau' }); return }
  for (const item of order) {
    await db.run('UPDATE sections SET orderIndex = ? WHERE id = ? AND projectId = ?', item.orderIndex, item.id, req.params.id)
  }
  await db.run("UPDATE projects SET lastModified = NOW() WHERE id = ?", req.params.id)
  res.json({ success: true })
})

router.put('/:id/sections/:sectionId', async (req: Request, res: Response) => {
  const project = await canAccess(req.params.id as string, req.user!.userId)
  if (!project) {
    res.status(404).json({ error: 'Projet non trouvé' })
    return
  }
  const section = await db.get('SELECT * FROM sections WHERE id = ? AND projectId = ?', req.params.sectionId, req.params.id) as any
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
    await db.run(`UPDATE sections SET ${updates.join(', ')} WHERE id = ?`, ...values)
    await db.run("UPDATE projects SET lastModified = NOW() WHERE id = ?", req.params.id)
  }
  const updated = await db.get('SELECT * FROM sections WHERE id = ?', req.params.sectionId)
  res.json(updated)
})

export default router
