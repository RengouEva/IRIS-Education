import { Router, Request, Response } from 'express'
import { z } from 'zod'
import db from '../database'
import { authMiddleware, adminMiddleware } from '../middleware/auth'
import crypto from 'crypto'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  const templates = db.prepare('SELECT * FROM templates ORDER BY createdAt DESC').all() as any[]
  const result = templates.map((t: any) => {
    const sections = db.prepare('SELECT * FROM template_default_sections WHERE templateId = ? ORDER BY orderIndex').all(t.id) as any[]
    return {
      ...t,
      defaultSections: sections.map((s: any) => {
        const subs = db.prepare('SELECT * FROM template_default_subsections WHERE defaultSectionId = ? ORDER BY orderIndex').all(s.id) as any[]
        return { ...s, subsections: subs.map((ss: any) => ({ title: ss.title })) }
      }),
    }
  })
  res.json(result)
})

router.get('/:id', (req: Request, res: Response) => {
  const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id) as any
  if (!template) { res.status(404).json({ error: 'Template non trouvé' }); return }
  const sections = db.prepare('SELECT * FROM template_default_sections WHERE templateId = ? ORDER BY orderIndex').all(template.id) as any[]
  template.defaultSections = sections.map((s: any) => {
    const subs = db.prepare('SELECT * FROM template_default_subsections WHERE defaultSectionId = ? ORDER BY orderIndex').all(s.id) as any[]
    return { ...s, subsections: subs.map((ss: any) => ({ title: ss.title })) }
  })
  res.json(template)
})

const templateSchema = z.object({
  name: z.string().min(1),
  level: z.enum(['licence', 'master', 'doctorat', 'stage']),
  description: z.string().default(''),
  image: z.string().default(''),
  defaultSections: z.array(z.object({
    title: z.string(),
    type: z.enum(['cover', 'dedication', 'thanks', 'abstract', 'sigles', 'introduction', 'chapter', 'conclusion', 'bibliography', 'annexes']),
    subsections: z.array(z.object({ title: z.string() })).default([]),
  })).default([]),
})

router.post('/', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const parsed = templateSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Données invalides', details: parsed.error.issues }); return }
  const { name, level, description, image, defaultSections } = parsed.data
  const id = crypto.randomUUID()
  db.prepare('INSERT INTO templates (id, name, level, description, image) VALUES (?, ?, ?, ?, ?)')
    .run(id, name, level, description, image)
  for (let i = 0; i < defaultSections.length; i++) {
    const ds = defaultSections[i]
    const sectionId = crypto.randomUUID()
    db.prepare('INSERT INTO template_default_sections (id, templateId, title, type, orderIndex) VALUES (?, ?, ?, ?, ?)')
      .run(sectionId, id, ds.title, ds.type, i)
    for (let j = 0; j < ds.subsections.length; j++) {
      db.prepare('INSERT INTO template_default_subsections (id, defaultSectionId, title, orderIndex) VALUES (?, ?, ?, ?)')
        .run(crypto.randomUUID(), sectionId, ds.subsections[j].title, j)
    }
  }
  const created = db.prepare('SELECT * FROM templates WHERE id = ?').get(id)
  res.status(201).json(created)
})

router.put('/:id', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id) as any
  if (!existing) { res.status(404).json({ error: 'Template non trouvé' }); return }
  const allowed = ['name', 'level', 'description', 'image']
  const updates: string[] = []
  const values: any[] = []
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates.push(`${key} = ?`)
      values.push(req.body[key])
    }
  }
  if (updates.length > 0) {
    values.push(req.params.id)
    db.prepare(`UPDATE templates SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  }
  if (req.body.defaultSections) {
    db.prepare('DELETE FROM template_default_sections WHERE templateId = ?').run(req.params.id)
    const sections = req.body.defaultSections as any[]
    for (let i = 0; i < sections.length; i++) {
      const ds = sections[i]
      const sectionId = crypto.randomUUID()
      db.prepare('INSERT INTO template_default_sections (id, templateId, title, type, orderIndex) VALUES (?, ?, ?, ?, ?)')
        .run(sectionId, req.params.id, ds.title, ds.type, i)
      const subs = ds.subsections || []
      for (let j = 0; j < subs.length; j++) {
        db.prepare('INSERT INTO template_default_subsections (id, defaultSectionId, title, orderIndex) VALUES (?, ?, ?, ?)')
          .run(crypto.randomUUID(), sectionId, subs[j].title, j)
      }
    }
  }
  const updated = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id)
  res.json(updated)
})

router.delete('/:id', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id) as any
  if (!existing) { res.status(404).json({ error: 'Template non trouvé' }); return }
  db.prepare('DELETE FROM templates WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

export default router
