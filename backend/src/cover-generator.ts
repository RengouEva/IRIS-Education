import db from './database'

interface CoverConfig {
  primaryColor: string
  secondaryColor: string
  fontSize?: { title: string; student: string; others: string }
  layout: 'classic' | 'modern'
  showUfr: boolean
  ufrLabel: string
  showDepartment: boolean
  departmentLabel: string
}

interface CoverData {
  universityName: string
  logo: string
  config: CoverConfig
  faculty: string
  field: string
  title: string
  theme: string
  studentFirstname: string
  studentLastname: string
  supervisor: string
  academicYear: string
}

function getCoverData(projectId: string): CoverData | null {
  const project = db.prepare(`
    SELECT p.*, u.firstname as studentFirstname, u.lastname as studentLastname,
           uni.name as universityName, uni.logo, uni.cover_config
    FROM projects p
    JOIN users u ON u.id = p.userId
    LEFT JOIN universities uni ON uni.id = p.universityId
    WHERE p.id = ?
  `).get(projectId) as any

  if (!project) return null

  let config: CoverConfig
  try {
    config = JSON.parse(project.cover_config || '{}')
  } catch {
    config = {
      primaryColor: '#003366',
      secondaryColor: '#C4A35A',
      layout: 'classic',
      showUfr: false,
      ufrLabel: 'Faculté',
      showDepartment: false,
      departmentLabel: '',
    }
  }

  let coverFields: Record<string, string> = {}
  try {
    coverFields = JSON.parse(project.cover_fields || '{}')
  } catch {}

  return {
    universityName: project.universityName || '',
    logo: project.logo || '',
    config,
    faculty: coverFields.faculty || project.faculty || '',
    field: project.field || '',
    title: project.title || '',
    theme: project.theme || '',
    studentFirstname: project.studentFirstname || '',
    studentLastname: project.studentLastname || '',
    supervisor: project.supervisor || '',
    academicYear: project.academicYear || '',
  }
}

export function generateCoverHtml(projectId: string): string | null {
  const data = getCoverData(projectId)
  if (!data) return null

  const { universityName, logo, config, faculty, field, title, theme, studentFirstname, studentLastname, supervisor, academicYear } = data
  const fs = config.fontSize || { title: '18pt', student: '12pt', others: '11pt' }

  if (config.layout === 'modern') {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 0; size: A4; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', Times, serif; color: #000; width: 210mm; height: 297mm; }
  .cover { width: 100%; height: 100%; display: flex; flex-direction: column; }
  .top-bar { background: ${config.primaryColor}; padding: 15mm 20mm 10mm; text-align: center; }
  .top-bar img { max-height: 60px; margin-bottom: 8px; }
  .top-bar h1 { color: #fff; font-size: ${fs.title}; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
  .line-accent { height: 3px; background: ${config.secondaryColor}; margin: 0 30mm; }
  .content { flex: 1; padding: 20mm 25mm; display: flex; flex-direction: column; justify-content: center; text-align: center; }
  .content .label { font-size: 11pt; color: #555; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px; }
  .content h2 { font-size: ${fs.title}; font-weight: bold; margin-bottom: 8px; line-height: 1.3; }
  .content .theme { font-size: 11pt; color: #333; font-style: italic; margin-bottom: 20px; }
  .content .info { font-size: ${fs.student}; margin-top: 20px; line-height: 2; }
  .content .info span { font-weight: bold; }
  .bottom-bar { background: ${config.primaryColor}; padding: 8mm 20mm; text-align: center; }
  .bottom-bar p { color: #fff; font-size: ${fs.others}; letter-spacing: 1px; }
</style>
</head>
<body>
<div class="cover">
  <div class="top-bar">
    ${logo ? `<img src="${logo}" alt="${universityName}" />` : ''}
    <h1>${universityName}</h1>
  </div>
  <div class="line-accent"></div>
  <div class="content">
    <p class="label">${field || 'Mémoire académique'}</p>
    <h2>${title}</h2>
    ${theme ? `<p class="theme">${theme}</p>` : ''}
    <div class="info">
      ${studentFirstname || studentLastname ? `<p>Présenté et soutenu par <span>${studentFirstname} ${studentLastname}</span></p>` : ''}
      ${supervisor ? `<p>Sous la direction de <span>${supervisor}</span></p>` : ''}
      ${faculty ? `<p>${faculty}</p>` : ''}
    </div>
  </div>
  <div class="line-accent"></div>
  <div class="bottom-bar">
    <p>Année académique ${academicYear}</p>
  </div>
</div>
</body>
</html>`
  }

  // Classic layout
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 0; size: A4; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', Times, serif; color: #000; width: 210mm; height: 297mm; }
  .cover { width: 100%; height: 100%; padding: 20mm 25mm; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .cover:before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 8mm; background: ${config.primaryColor}; }
  .cover img { max-height: 80px; margin-bottom: 10px; }
  .cover h1 { font-size: 14pt; font-weight: bold; text-transform: uppercase; color: ${config.primaryColor}; margin-bottom: 4px; line-height: 1.4; }
  ${config.showUfr ? `.cover .ufr { font-size: 11pt; color: #444; margin-bottom: 2px; }` : ''}
  ${config.showDepartment ? `.cover .department { font-size: 11pt; color: #555; margin-bottom: 6px; }` : ''}
  .cover .field { font-size: 11pt; color: #666; margin-bottom: 15px; font-style: italic; }
  .cover .divider { width: 60%; height: 1px; background: ${config.secondaryColor}; margin: 12px auto; }
  .cover .label { font-size: 12pt; font-weight: normal; text-transform: uppercase; letter-spacing: 3px; color: #555; margin-bottom: 15px; }
  .cover h2 { font-size: ${fs.title}; font-weight: bold; line-height: 1.3; margin-bottom: 6px; }
  .cover .theme-text { font-size: 11pt; color: #333; font-style: italic; margin-bottom: 15px; }
  .cover .student-info { font-size: ${fs.student}; line-height: 2; margin-top: 10px; }
  .cover .student-info span { font-weight: bold; }
  .cover .year { font-size: ${fs.others}; color: ${config.primaryColor}; font-weight: bold; margin-top: 15px; }
</style>
</head>
<body>
<div class="cover">
  ${logo ? `<img src="${logo}" alt="${universityName}" />` : ''}
  <h1>${universityName}</h1>
  ${config.showUfr ? `<p class="ufr">${config.ufrLabel}</p>` : ''}
  ${config.showDepartment ? `<p class="department">${config.departmentLabel}</p>` : ''}
  <p class="field">${field || ''}</p>
  <div class="divider"></div>
  <p class="label">${studentFirstname || studentLastname ? 'Mémoire de fin de cycle' : ''}</p>
  <h2>${title}</h2>
  ${theme ? `<p class="theme-text">${theme}</p>` : ''}
  <div class="student-info">
    ${studentFirstname || studentLastname ? `<p>Présenté et soutenu par <span>${studentFirstname} ${studentLastname}</span></p>` : ''}
    ${supervisor ? `<p>Sous la direction de <span>${supervisor}</span></p>` : ''}
    ${faculty ? `<p>${faculty}</p>` : ''}
  </div>
  <div class="divider"></div>
  <p class="year">Année académique ${academicYear}</p>
</div>
</body>
</html>`
}
