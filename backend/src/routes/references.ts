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

router.get('/', async (req: Request, res: Response) => {
  const { projectId } = req.query
  if (!projectId) { res.status(400).json({ error: 'projectId requis' }); return }
  const refs = await db.all(`
    SELECT r.*, STRING_AGG(ra.firstname || ' ' || ra.lastname, ', ') as "authorsStr"
    FROM references_table r
    LEFT JOIN reference_authors ra ON ra.referenceId = r.id
    WHERE r.projectId = ?
    GROUP BY r.id
    ORDER BY r.createdAt DESC
  `, projectId as string) as any[]
  res.json(refs)
})

router.post('/', async (req: Request, res: Response) => {
  const parsed = referenceSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Données invalides', details: parsed.error.issues }); return }
  const { projectId, type, title, subtitle, year, publisher, place, pages, doi, url, format, authors } = parsed.data
  const project = await db.get('SELECT * FROM projects WHERE id = ?', projectId) as any
  if (!project || project.userId !== req.user!.userId) { res.status(404).json({ error: 'Projet non trouvé' }); return }
  const id = crypto.randomUUID()
  await db.run(`
    INSERT INTO references_table (id, projectId, type, title, subtitle, year, publisher, place, pages, doi, url, format)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, id, projectId, type, title, subtitle || '', year, publisher || '', place || '', pages || '', doi || '', url || '', format)
  for (const author of authors) {
    await db.run('INSERT INTO reference_authors (id, referenceId, firstname, lastname) VALUES (?, ?, ?, ?)',
      crypto.randomUUID(), id, author.firstname, author.lastname)
  }
  res.status(201).json({ id, ...parsed.data })
})

router.put('/:id', async (req: Request, res: Response) => {
  const parsed = referenceSchema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Données invalides', details: parsed.error.issues }); return }
  const ref = await db.get(`
    SELECT r.* FROM references_table r
    JOIN projects p ON p.id = r.projectId
    WHERE r.id = ? AND p.userId = ?
  `, req.params.id, req.user!.userId) as any
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
    await db.run(`UPDATE references_table SET ${updates.join(', ')} WHERE id = ?`, ...values)
  }
  if (parsed.data.authors) {
    await db.run('DELETE FROM reference_authors WHERE referenceId = ?', req.params.id)
    for (const author of parsed.data.authors) {
      await db.run('INSERT INTO reference_authors (id, referenceId, firstname, lastname) VALUES (?, ?, ?, ?)',
        crypto.randomUUID(), req.params.id, author.firstname, author.lastname)
    }
  }
  const updated = await db.get(`
    SELECT r.*, STRING_AGG(ra.firstname || ' ' || ra.lastname, ', ') as "authorsStr"
    FROM references_table r
    LEFT JOIN reference_authors ra ON ra.referenceId = r.id
    WHERE r.id = ?
    GROUP BY r.id
  `, req.params.id) as any
  res.json(updated)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const ref = await db.get(`
    SELECT r.* FROM references_table r
    JOIN projects p ON p.id = r.projectId
    WHERE r.id = ? AND p.userId = ?
  `, req.params.id, req.user!.userId) as any
  if (!ref) { res.status(404).json({ error: 'Référence non trouvée' }); return }
  await db.run('DELETE FROM references_table WHERE id = ?', req.params.id)
  res.json({ success: true })
})

export default router
