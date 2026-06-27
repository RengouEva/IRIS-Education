import { Router, Request, Response } from 'express'
import { z } from 'zod'
import db from '../database.js'
import { authMiddleware, adminMiddleware } from '../middleware/auth.js'
import crypto from 'crypto'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  const templates = await db.all('SELECT * FROM templates ORDER BY createdAt DESC') as any[]
  const result = await Promise.all(templates.map(async (t: any) => {
    const sections = await db.all('SELECT * FROM template_default_sections WHERE templateId = ? ORDER BY orderIndex', t.id) as any[]
    return {
      ...t,
      defaultSections: await Promise.all(sections.map(async (s: any) => {
        const subs = await db.all('SELECT * FROM template_default_subsections WHERE defaultSectionId = ? ORDER BY orderIndex', s.id) as any[]
        return { ...s, subsections: subs.map((ss: any) => ({ title: ss.title })) }
      })),
    }
  }))
  res.json(result)
})

router.get('/:id', async (req: Request, res: Response) => {
  const template = await db.get('SELECT * FROM templates WHERE id = ?', req.params.id) as any
  if (!template) { res.status(404).json({ error: 'Template non trouvé' }); return }
  const sections = await db.all('SELECT * FROM template_default_sections WHERE templateId = ? ORDER BY orderIndex', template.id) as any[]
  template.defaultSections = await Promise.all(sections.map(async (s: any) => {
    const subs = await db.all('SELECT * FROM template_default_subsections WHERE defaultSectionId = ? ORDER BY orderIndex', s.id) as any[]
    return { ...s, subsections: subs.map((ss: any) => ({ title: ss.title })) }
  }))
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

router.post('/', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const parsed = templateSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Données invalides', details: parsed.error.issues }); return }
  const { name, level, description, image, defaultSections } = parsed.data
  const id = crypto.randomUUID()
  await db.run('INSERT INTO templates (id, name, level, description, image) VALUES (?, ?, ?, ?, ?)',
    id, name, level, description, image)
  for (let i = 0; i < defaultSections.length; i++) {
    const ds = defaultSections[i]
    const sectionId = crypto.randomUUID()
    await db.run('INSERT INTO template_default_sections (id, templateId, title, type, orderIndex) VALUES (?, ?, ?, ?, ?)',
      sectionId, id, ds.title, ds.type, i)
    for (let j = 0; j < ds.subsections.length; j++) {
      await db.run('INSERT INTO template_default_subsections (id, defaultSectionId, title, orderIndex) VALUES (?, ?, ?, ?)',
        crypto.randomUUID(), sectionId, ds.subsections[j].title, j)
    }
  }
  const created = await db.get('SELECT * FROM templates WHERE id = ?', id)
  res.status(201).json(created)
})

router.put('/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const existing = await db.get('SELECT * FROM templates WHERE id = ?', req.params.id) as any
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
    await db.run(`UPDATE templates SET ${updates.join(', ')} WHERE id = ?`, ...values)
  }
  if (req.body.defaultSections) {
    await db.run('DELETE FROM template_default_sections WHERE templateId = ?', req.params.id)
    const sections = req.body.defaultSections as any[]
    for (let i = 0; i < sections.length; i++) {
      const ds = sections[i]
      const sectionId = crypto.randomUUID()
      await db.run('INSERT INTO template_default_sections (id, templateId, title, type, orderIndex) VALUES (?, ?, ?, ?, ?)',
        sectionId, req.params.id, ds.title, ds.type, i)
      const subs = ds.subsections || []
      for (let j = 0; j < subs.length; j++) {
        await db.run('INSERT INTO template_default_subsections (id, defaultSectionId, title, orderIndex) VALUES (?, ?, ?, ?)',
          crypto.randomUUID(), sectionId, subs[j].title, j)
      }
    }
  }
  const updated = await db.get('SELECT * FROM templates WHERE id = ?', req.params.id)
  res.json(updated)
})

router.delete('/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const existing = await db.get('SELECT * FROM templates WHERE id = ?', req.params.id) as any
  if (!existing) { res.status(404).json({ error: 'Template non trouvé' }); return }
  await db.run('DELETE FROM templates WHERE id = ?', req.params.id)
  res.json({ success: true })
})

export default router
