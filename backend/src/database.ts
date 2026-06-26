import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, '..', 'data.db')

const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      firstname TEXT NOT NULL,
      lastname TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('student','supervisor','admin')),
      avatar TEXT,
      universityId TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS universities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      country TEXT NOT NULL DEFAULT '',
      logo TEXT,
      cover_config TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      theme TEXT NOT NULL DEFAULT '',
      field TEXT NOT NULL DEFAULT '',
      level TEXT NOT NULL CHECK(level IN ('licence','master','doctorat','stage')),
      academicYear TEXT NOT NULL DEFAULT '',
      supervisor TEXT NOT NULL DEFAULT '',
      universityId TEXT,
      faculty TEXT NOT NULL DEFAULT '',
      cover_fields TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','review','submitted')),
      progress REAL NOT NULL DEFAULT 0,
      lastModified TEXT NOT NULL DEFAULT (datetime('now')),
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sections (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL CHECK(type IN ('cover','dedication','thanks','abstract','sigles','introduction','chapter','conclusion','bibliography','annexes')),
      content TEXT NOT NULL DEFAULT '',
      orderIndex INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'en_cours' CHECK(status IN ('valide','en_cours','a_corriger'))
    );

    CREATE TABLE IF NOT EXISTS subsections (
      id TEXT PRIMARY KEY,
      sectionId TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      orderIndex INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS references_table (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('book','article','chapter','thesis','report','website','conference')),
      title TEXT NOT NULL,
      subtitle TEXT DEFAULT '',
      year INTEGER NOT NULL,
      publisher TEXT DEFAULT '',
      place TEXT DEFAULT '',
      pages TEXT DEFAULT '',
      doi TEXT DEFAULT '',
      url TEXT DEFAULT '',
      format TEXT NOT NULL DEFAULT 'apa' CHECK(format IN ('apa','mla','chicago','iso690')),
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reference_authors (
      id TEXT PRIMARY KEY,
      referenceId TEXT NOT NULL REFERENCES references_table(id) ON DELETE CASCADE,
      firstname TEXT NOT NULL DEFAULT '',
      lastname TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      level TEXT NOT NULL CHECK(level IN ('licence','master','doctorat','stage')),
      description TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS template_default_sections (
      id TEXT PRIMARY KEY,
      templateId TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('cover','dedication','thanks','abstract','sigles','introduction','chapter','conclusion','bibliography','annexes')),
      orderIndex INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS template_default_subsections (
      id TEXT PRIMARY KEY,
      defaultSectionId TEXT NOT NULL REFERENCES template_default_sections(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      orderIndex INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      sectionId TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      userName TEXT NOT NULL DEFAULT '',
      avatar TEXT DEFAULT '',
      content TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      anchorText TEXT DEFAULT '',
      resolved INTEGER NOT NULL DEFAULT 0,
      resolvedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS comment_replies (
      id TEXT PRIMARY KEY,
      commentId TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      userName TEXT NOT NULL DEFAULT '',
      avatar TEXT DEFAULT '',
      content TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS versions (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      label TEXT NOT NULL DEFAULT '',
      description TEXT DEFAULT '',
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS version_sections (
      id TEXT PRIMARY KEY,
      versionId TEXT NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
      sectionId TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'info',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT DEFAULT '',
      read INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ai_messages (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user','assistant')),
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  try { db.exec(`ALTER TABLE comments ADD COLUMN audioUrl TEXT DEFAULT ''`) } catch {}
  try { db.exec(`ALTER TABLE comment_replies ADD COLUMN audioUrl TEXT DEFAULT ''`) } catch {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS project_collaborators (
        id TEXT PRIMARY KEY,
        projectId TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        userId TEXT,
        email TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('supervisor','student')),
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined')),
        token TEXT NOT NULL,
        createdAt TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)
  } catch {}
}

export default db
