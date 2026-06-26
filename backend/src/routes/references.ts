import { Router, Request, Response } from 'express'
import { z } from 'zod'
import db from '../database'
import { authMiddleware } from '../middleware/auth'
import crypto from 'crypto'

const router = Router()
router.use(authMiddleware)

const referenceSchema = z.object({
  projectId: z.string(),
  type: z.enum(['book', 'article', 'chapter', 'thesis', 'report', 'website', 'conference']),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  year: z.number(),
  publisher: z.string().optional(),
  place: z.string().optional(),
  pages: z.string().optional(),
  doi: z.string().optional(),
  url: z.string().optional(),
  format: z.enum(['apa', 'mla', 'chicago', 'iso690']).default('apa'),
  authors: z.array(z.object({ firstname: z.string(), lastname: z.string() })).default([]),
})

router.get('/', (req: Request, res: Response) => {
  const { projectId } = req.query
  if (!projectId) { res.status(400).json({ error: 'projectId requis' }); return }
  const refs = db.prepare(`
    SELECT r.*, GROUP_CONCAT(ra.firstname || ' ' || ra.lastname, ', ') as authorsStr
    FROM references_table r
    LEFT JOIN reference_authors ra ON ra.referenceId = r.id
    WHERE r.projectId = ?
    GROUP BY r.id
    ORDER BY r.createdAt DESC
  `).all(projectId as string) as any[]
  res.json(refs)
})

router.post('/', (req: Request, res: Response) => {
  const parsed = referenceSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Données invalides', details: parsed.error.issues }); return }
  const { projectId, type, title, subtitle, year, publisher, place, pages, doi, url, format, authors } = parsed.data
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any
  if (!project || project.userId !== req.user!.userId) { res.status(404).json({ error: 'Projet non trouvé' }); return }
  const id = crypto.randomUUID()
  db.prepare(`
    INSERT INTO references_table (id, projectId, type, title, subtitle, year, publisher, place, pages, doi, url, format)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, projectId, type, title, subtitle || '', year, publisher || '', place || '', pages || '', doi || '', url || '', format)
  for (const author of authors) {
    db.prepare('INSERT INTO reference_authors (id, referenceId, firstname, lastname) VALUES (?, ?, ?, ?)')
      .run(crypto.randomUUID(), id, author.firstname, author.lastname)
  }
  res.status(201).json({ id, ...parsed.data })
})

router.put('/:id', (req: Request, res: Response) => {
  const parsed = referenceSchema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Données invalides', details: parsed.error.issues }); return }
  const ref = db.prepare(`
    SELECT r.* FROM references_table r
    JOIN projects p ON p.id = r.projectId
    WHERE r.id = ? AND p.userId = ?
  `).get(req.params.id, req.user!.userId) as any
  if (!ref) { res.status(404).json({ error: 'Référence non trouvée' }); return }
  const allowed = ['type', 'title', 'subtitle', 'year', 'publisher', 'place', 'pages', 'doi', 'url', 'format']
  const updates: string[] = []
  const values: any[] = []
  for (const key of allowed) {
    if (parsed.data[key as keyof typeof parsed.data] !== undefined) {
      updates.push(`${key} = ?`)
      values.push(parsed.data[key as keyof typeof parsed.data])
    }
  }
  if (updates.length > 0) {
    values.push(req.params.id)
    db.prepare(`UPDATE references_table SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  }
  if (parsed.data.authors) {
    db.prepare('DELETE FROM reference_authors WHERE referenceId = ?').run(req.params.id)
    for (const author of parsed.data.authors) {
      db.prepare('INSERT INTO reference_authors (id, referenceId, firstname, lastname) VALUES (?, ?, ?, ?)')
        .run(crypto.randomUUID(), req.params.id, author.firstname, author.lastname)
    }
  }
  const updated = db.prepare(`
    SELECT r.*, GROUP_CONCAT(ra.firstname || ' ' || ra.lastname, ', ') as authorsStr
    FROM references_table r
    LEFT JOIN reference_authors ra ON ra.referenceId = r.id
    WHERE r.id = ?
    GROUP BY r.id
  `).get(req.params.id) as any
  res.json(updated)
})

router.delete('/:id', (req: Request, res: Response) => {
  const ref = db.prepare(`
    SELECT r.* FROM references_table r
    JOIN projects p ON p.id = r.projectId
    WHERE r.id = ? AND p.userId = ?
  `).get(req.params.id, req.user!.userId) as any
  if (!ref) { res.status(404).json({ error: 'Référence non trouvée' }); return }
  db.prepare('DELETE FROM references_table WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

export default router
