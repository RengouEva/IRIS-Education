import { Router, Request, Response } from 'express'
import db from '../database'
import { authMiddleware } from '../middleware/auth'
import { generateCoverHtml } from '../cover-generator'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, TableOfContents, AlignmentType, PageBreak, Header, Footer, PageNumber, TabStopPosition, TabStopType } from 'docx'

const router = Router()
router.use(authMiddleware)

router.get('/:projectId', (req: Request, res: Response) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId) as any
  if (!project || project.userId !== req.user!.userId) {
    res.status(404).json({ error: 'Projet non trouvé' })
    return
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(project.userId) as any
  const sections = db.prepare('SELECT * FROM sections WHERE projectId = ? ORDER BY orderIndex').all(project.id) as any[]
  const refs = db.prepare(`
    SELECT r.*, GROUP_CONCAT(ra.firstname || ' ' || ra.lastname, ', ') as authorsStr
    FROM references_table r
    LEFT JOIN reference_authors ra ON ra.referenceId = r.id
    WHERE r.projectId = ?
    GROUP BY r.id
  `).all(project.id) as any[]

  const coverHtml = generateCoverHtml(project.id) || ''

  const sectionsHtml = sections.map((s) => `
    <div class="section">
      <h2 class="section-title">${s.title}</h2>
      <div class="section-content">${s.content || '<p style="color:#999">Section vide</p>'}</div>
    </div>
  `).join('\n')

  const refsHtml = refs.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Bibliographie</h2>
      <div class="section-content">
        <ul class="bibliography">
          ${refs.map((r) => `<li>${r.authorsStr || ''} (${r.year}). ${r.title}${r.publisher ? `. ${r.publisher}` : ''}</li>`).join('\n')}
        </ul>
      </div>
    </div>
  ` : ''

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${project.title}</title>
<style>
  @page { margin: 25mm 30mm; size: A4; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.8; color: #000; }
  .section { page-break-inside: avoid; margin-bottom: 20px; margin-top: 25mm; }
  .section-title { font-size: 14pt; font-weight: bold; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #ccc; }
  .section-content { text-align: justify; }
  .section-content p { margin-bottom: 8px; }
  .bibliography { list-style: none; padding-left: 0; }
  .bibliography li { margin-bottom: 6px; text-indent: -30px; padding-left: 30px; }
  @media print {
    .no-print { display: none; }
  }
</style>
</head>
<body>
  ${coverHtml}
  ${sectionsHtml}
  ${refsHtml}
  <script>window.print()</script>
</body>
</html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
})

router.get('/:projectId/cover', (req: Request, res: Response) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId) as any
  if (!project || project.userId !== req.user!.userId) {
    res.status(404).json({ error: 'Projet non trouvé' })
    return
  }

  const html = generateCoverHtml(project.id)
  if (!html) {
    res.status(404).json({ error: 'Impossible de générer la page de garde' })
    return
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
})

router.get('/:projectId/docx', async (req: Request, res: Response) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId) as any
  if (!project || project.userId !== req.user!.userId) {
    res.status(404).json({ error: 'Projet non trouvé' }); return
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(project.userId) as any
  const sections = db.prepare('SELECT * FROM sections WHERE projectId = ? ORDER BY orderIndex').all(project.id) as any[]
  const refs = db.prepare(`
    SELECT r.*, GROUP_CONCAT(ra.firstname || ' ' || ra.lastname, ', ') as authorsStr
    FROM references_table r
    LEFT JOIN reference_authors ra ON ra.referenceId = r.id
    WHERE r.projectId = ?
    GROUP BY r.id
  `).all(project.id) as any[]

  const children: any[] = []

  children.push(
    new Paragraph({ spacing: { after: 400 } }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: project.title || 'Mémoire', size: 32, bold: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: `${user?.firstname || ''} ${user?.lastname || ''}`, size: 24 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: project.level || '', size: 22 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: project.faculty || '', size: 22 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [new TextRun({ text: project.academicYear || '', size: 22 })] }),
    new Paragraph({ children: [new TextRun({ text: '' })] }),
    new PageBreak(),
  )

  for (const section of sections) {
    if (section.type === 'cover') continue
    const isChapter = section.type === 'chapter'
    children.push(
      new Paragraph({
        heading: isChapter ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
        children: [new TextRun({ text: section.title, bold: true, size: isChapter ? 28 : 24 })],
      }),
    )
    if (section.content) {
      const text = section.content.replace(/<[^>]*>/g, '').trim()
      const paragraphs = text.split('\n').filter(Boolean)
      for (const p of paragraphs) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 120, line: 360 },
            children: [new TextRun({ text: p, size: 22 })],
          }),
        )
      }
    }
  }

  if (refs.length > 0) {
    children.push(new PageBreak())
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 300 },
        children: [new TextRun({ text: 'Bibliographie', bold: true, size: 28 })],
      }),
    )
    for (const ref of refs) {
      children.push(
        new Paragraph({
          spacing: { after: 100 },
          indent: { left: 720, hanging: 720 },
          children: [new TextRun({ text: `${ref.authorsStr || ''} (${ref.year}). ${ref.title}${ref.publisher ? `. ${ref.publisher}` : ''}.`, size: 22 })],
        }),
      )
    }
  }

  const doc = new Document({
    title: project.title,
    description: `Mémoire généré par IRIS-Education`,
    styles: { default: { document: { run: { font: 'Times New Roman', size: 22 } } } },
    sections: [{ children }],
  })

  const buffer = await Packer.toBuffer(doc)
  const filename = `${project.title.replace(/[^a-zA-Z0-9]/g, '_')}.docx`
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(buffer)
})

export default router
