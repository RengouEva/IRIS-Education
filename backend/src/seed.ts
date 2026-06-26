import { initDatabase } from './database.js'
import db from './database.js'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

initDatabase()

const existingAdmin = db.prepare("SELECT id FROM users WHERE email = 'admin@iris.edu'").get()
if (existingAdmin) {
  console.log('Base de données déjà initialisée. (admin@iris.edu / admin123)')
  process.exit(0)
}

const adminId = crypto.randomUUID()
const supervisorId = crypto.randomUUID()
const studentId = crypto.randomUUID()
const uniId1 = crypto.randomUUID()
const uniId2 = crypto.randomUUID()
const uniId3 = crypto.randomUUID()

const coverConfig1 = JSON.stringify({
  primaryColor: '#003366',
  secondaryColor: '#C4A35A',
  fontSize: { title: '18pt', student: '12pt', others: '11pt' },
  layout: 'classic',
  showUfr: true,
  ufrLabel: 'UFR des Sciences de l\'Homme et de la Société',
  showDepartment: true,
  departmentLabel: 'Département des Sciences Sociales',
})

const coverConfig2 = JSON.stringify({
  primaryColor: '#1A5276',
  secondaryColor: '#D4AC0D',
  fontSize: { title: '18pt', student: '12pt', others: '11pt' },
  layout: 'modern',
  showUfr: true,
  ufrLabel: 'Faculté des Sciences et Techniques',
  showDepartment: true,
  departmentLabel: 'Département Informatique',
})

const coverConfig3 = JSON.stringify({
  primaryColor: '#2E4053',
  secondaryColor: '#B7950B',
  fontSize: { title: '18pt', student: '12pt', others: '11pt' },
  layout: 'classic',
  showUfr: true,
  ufrLabel: 'Faculté des Arts, Lettres et Sciences Humaines',
  showDepartment: false,
})

db.prepare('INSERT INTO universities (id, name, country, logo, cover_config) VALUES (?, ?, ?, ?, ?)').run(uniId1, 'Université Félix Houphouët-Boigny', "Côte d'Ivoire", '/images/university-logo-1.png', coverConfig1)
db.prepare('INSERT INTO universities (id, name, country, logo, cover_config) VALUES (?, ?, ?, ?, ?)').run(uniId2, 'Université Cheikh Anta Diop', 'Sénégal', '/images/university-logo-2.png', coverConfig2)
db.prepare('INSERT INTO universities (id, name, country, logo, cover_config) VALUES (?, ?, ?, ?, ?)').run(uniId3, 'Université de Yaoundé I', 'Cameroun', '/images/university-logo-3.png', coverConfig3)

db.prepare('INSERT INTO users (id, firstname, lastname, email, password, role, avatar, universityId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
  .run(adminId, 'Admin', 'IRIS', 'admin@iris.edu', bcrypt.hashSync('admin123', 10), 'admin', '', uniId1)
db.prepare('INSERT INTO users (id, firstname, lastname, email, password, role, avatar, universityId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
  .run(supervisorId, 'Amadou', 'Diallo', 'amadou.diallo@univ.fr', bcrypt.hashSync('password123', 10), 'supervisor', '/images/avatar-user-2.jpg', uniId1)
db.prepare('INSERT INTO users (id, firstname, lastname, email, password, role, avatar, universityId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
  .run(studentId, 'Marie', 'Kouassi', 'marie.kouassi@univ.fr', bcrypt.hashSync('password123', 10), 'student', '/images/avatar-user-3.jpg', uniId1)

const templateId = crypto.randomUUID()
db.prepare('INSERT INTO templates (id, name, level, description, image) VALUES (?, ?, ?, ?, ?)')
  .run(templateId, 'Mémoire de Master', 'master', 'Template standard pour mémoire de Master avec toutes les sections académiques', '/images/template-master.jpg')

const sections = [
  { title: 'Page de couverture', type: 'cover' as const },
  { title: 'Dédicace', type: 'dedication' as const },
  { title: 'Remerciements', type: 'thanks' as const },
  { title: 'Résumé', type: 'abstract' as const },
  { title: 'Liste des sigles et abréviations', type: 'sigles' as const },
  { title: 'Introduction générale', type: 'introduction' as const },
  { title: 'Chapitre I : Cadre théorique et conceptuel', type: 'chapter' as const, subs: ['1.1 Contexte', '1.2 Revue de littérature', '1.3 Problématique'] },
  { title: 'Chapitre II : Méthodologie de recherche', type: 'chapter' as const, subs: ['2.1 Approche méthodologique', '2.2 Collecte des données', '2.3 Analyse des données'] },
  { title: 'Chapitre III : Présentation et analyse des résultats', type: 'chapter' as const, subs: ['3.1 Résultats quantitatifs', '3.2 Résultats qualitatifs', '3.3 Discussion'] },
  { title: 'Conclusion générale', type: 'conclusion' as const },
  { title: 'Bibliographie', type: 'bibliography' as const },
  { title: 'Annexes', type: 'annexes' as const },
]
for (let i = 0; i < sections.length; i++) {
  const s = sections[i]
  const sectionId = crypto.randomUUID()
  db.prepare('INSERT INTO template_default_sections (id, templateId, title, type, orderIndex) VALUES (?, ?, ?, ?, ?)')
    .run(sectionId, templateId, s.title, s.type, i)
  if (s.subs) {
    for (let j = 0; j < s.subs.length; j++) {
      db.prepare('INSERT INTO template_default_subsections (id, defaultSectionId, title, orderIndex) VALUES (?, ?, ?, ?)')
        .run(crypto.randomUUID(), sectionId, s.subs[j], j)
    }
  }
}

const templateLicenceId = crypto.randomUUID()
db.prepare('INSERT INTO templates (id, name, level, description, image) VALUES (?, ?, ?, ?, ?)')
  .run(templateLicenceId, 'Mémoire de Licence', 'licence', 'Template pour mémoire de Licence avec structure simplifiée', '/images/template-licence.jpg')
const licenceSections = ['Introduction générale', 'Chapitre I : Revue de littérature', 'Chapitre II : Analyse', 'Conclusion', 'Bibliographie']
for (let i = 0; i < licenceSections.length; i++) {
  db.prepare('INSERT INTO template_default_sections (id, templateId, title, type, orderIndex) VALUES (?, ?, ?, ?, ?)')
    .run(crypto.randomUUID(), templateLicenceId, licenceSections[i], i === 0 ? 'introduction' : i === licenceSections.length - 2 ? 'conclusion' : i === licenceSections.length - 1 ? 'bibliography' : 'chapter', i)
}

const templateDoctoratId = crypto.randomUUID()
db.prepare('INSERT INTO templates (id, name, level, description, image) VALUES (?, ?, ?, ?, ?)')
  .run(templateDoctoratId, 'Thèse de Doctorat', 'doctorat', 'Template complet pour thèse de Doctorat', '/images/template-doctorat.jpg')
const doctoratSections = ['Page de couverture', 'Dédicace', 'Remerciements', 'Résumé', 'Liste des sigles', 'Introduction générale', 'Chapitre I', 'Chapitre II', 'Chapitre III', 'Chapitre IV', 'Conclusion générale', 'Bibliographie', 'Annexes']
for (let i = 0; i < doctoratSections.length; i++) {
  db.prepare('INSERT INTO template_default_sections (id, templateId, title, type, orderIndex) VALUES (?, ?, ?, ?, ?)')
    .run(crypto.randomUUID(), templateDoctoratId, doctoratSections[i],
      ['cover', 'dedication', 'thanks', 'abstract', 'sigles', 'introduction', 'chapter', 'chapter', 'chapter', 'chapter', 'conclusion', 'bibliography', 'annexes'][i], i)
}

const templateStageId = crypto.randomUUID()
db.prepare('INSERT INTO templates (id, name, level, description, image) VALUES (?, ?, ?, ?, ?)')
  .run(templateStageId, 'Rapport de Stage', 'stage', 'Template pour rapport de stage professionnel', '/images/template-stage.jpg')

db.prepare("INSERT INTO app_config (key, value) VALUES ('appName', 'IRIS-Education')").run()
db.prepare("INSERT INTO app_config (key, value) VALUES ('appDescription', 'Rédaction de mémoires académiques assistée par IA')").run()
db.prepare("INSERT INTO app_config (key, value) VALUES ('contactEmail', 'contact@iris-education.ai')").run()
db.prepare("INSERT INTO app_config (key, value) VALUES ('maxProjectsFree', '3')").run()
db.prepare("INSERT INTO app_config (key, value) VALUES ('aiSuggestionsPerDay', '20')").run()

console.log('Base de données initialisée avec succès !')
console.log('')
console.log('Comptes de test :')
console.log('  Admin : admin@iris.edu / admin123')
console.log('  Étudiant : marie.kouassi@univ.fr / password123')
console.log('  Superviseur : amadou.diallo@univ.fr / password123')
console.log('')
console.log('Templates créés : Licence, Master, Doctorat, Stage')
