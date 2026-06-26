import { describe, it, expect, beforeAll } from 'vitest'
import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, '..', '..', 'data.db')

function getDb() {
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}

describe('Auth - Database operations', () => {
  let db: Database.Database

  beforeAll(() => {
    db = getDb()
  })

  it('should create and find a user', () => {
    const id = crypto.randomUUID()
    const email = `test-${Date.now()}@test.com`
    const password = bcrypt.hashSync('password123', 10)

    db.prepare(
      'INSERT INTO users (id, firstname, lastname, email, password, role) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, 'Test', 'User', email, password, 'student')

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any
    expect(user).toBeTruthy()
    expect(user.email).toBe(email)
    expect(user.firstname).toBe('Test')
    expect(user.lastname).toBe('User')
    expect(user.role).toBe('student')
    expect(bcrypt.compareSync('password123', user.password)).toBe(true)

    db.prepare('DELETE FROM users WHERE id = ?').run(id)
  })

  it('should reject duplicate emails', () => {
    const id1 = crypto.randomUUID()
    const id2 = crypto.randomUUID()
    const email = `dup-${Date.now()}@test.com`

    db.prepare(
      'INSERT INTO users (id, firstname, lastname, email, password, role) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id1, 'First', 'User', email, 'hash', 'student')

    expect(() => {
      db.prepare(
        'INSERT INTO users (id, firstname, lastname, email, password, role) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(id2, 'Second', 'User', email, 'hash', 'student')
    }).toThrow()

    db.prepare('DELETE FROM users WHERE id = ?').run(id1)
  })

  it('should update user avatar', () => {
    const id = crypto.randomUUID()
    const email = `avatar-${Date.now()}@test.com`

    db.prepare(
      'INSERT INTO users (id, firstname, lastname, email, password, role) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, 'Avatar', 'Test', email, 'hash', 'student')

    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run('/uploads/images/test.jpg', id)
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any
    expect(user.avatar).toBe('/uploads/images/test.jpg')

    db.prepare('DELETE FROM users WHERE id = ?').run(id)
  })

  it('should enforce valid roles', () => {
    const id = crypto.randomUUID()
    const email = `role-${Date.now()}@test.com`

    expect(() => {
      db.prepare(
        'INSERT INTO users (id, firstname, lastname, email, password, role) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(id, 'Role', 'Test', email, 'hash', 'invalid_role')
    }).toThrow()
  })
})

describe('Project - Database operations', () => {
  let db: Database.Database
  let userId: string

  beforeAll(() => {
    db = getDb()
    userId = crypto.randomUUID()
    db.prepare(
      'INSERT INTO users (id, firstname, lastname, email, password, role) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId, 'Project', 'Owner', `proj-${Date.now()}@test.com`, 'hash', 'student')
  })

  it('should create a project for a user', () => {
    const projectId = crypto.randomUUID()
    db.prepare(`
      INSERT INTO projects (id, userId, title, theme, level, academicYear, supervisor, field)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(projectId, userId, 'Mon mémoire', 'IA en éducation', 'master', '2025-2026', 'Dr. Dupont', 'Informatique')

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any
    expect(project).toBeTruthy()
    expect(project.title).toBe('Mon mémoire')
    expect(project.level).toBe('master')
    expect(project.userId).toBe(userId)
    expect(project.status).toBe('draft')

    db.prepare('DELETE FROM projects WHERE id = ?').run(projectId)
  })

  it('should cascade delete sections when project is deleted', () => {
    const projectId = crypto.randomUUID()
    db.prepare(`
      INSERT INTO projects (id, userId, title, level) VALUES (?, ?, ?, ?)
    `).run(projectId, userId, 'Test cascade', 'licence')

    const sectionId = crypto.randomUUID()
    db.prepare('INSERT INTO sections (id, projectId, title, type) VALUES (?, ?, ?, ?)')
      .run(sectionId, projectId, 'Introduction', 'introduction')

    db.prepare('DELETE FROM projects WHERE id = ?').run(projectId)
    const section = db.prepare('SELECT * FROM sections WHERE id = ?').get(sectionId)
    expect(section).toBeFalsy()
  })

  it('should create sections with order index', () => {
    const projectId = crypto.randomUUID()
    db.prepare(`
      INSERT INTO projects (id, userId, title, level) VALUES (?, ?, ?, ?)
    `).run(projectId, userId, 'Test order', 'master')

    db.prepare('INSERT INTO sections (id, projectId, title, type, orderIndex) VALUES (?, ?, ?, ?, ?)')
      .run(crypto.randomUUID(), projectId, 'Section 1', 'introduction', 0)
    db.prepare('INSERT INTO sections (id, projectId, title, type, orderIndex) VALUES (?, ?, ?, ?, ?)')
      .run(crypto.randomUUID(), projectId, 'Section 2', 'chapter', 1)
    db.prepare('INSERT INTO sections (id, projectId, title, type, orderIndex) VALUES (?, ?, ?, ?, ?)')
      .run(crypto.randomUUID(), projectId, 'Section 3', 'conclusion', 2)

    const sections = db.prepare(
      'SELECT * FROM sections WHERE projectId = ? ORDER BY orderIndex'
    ).all(projectId) as any[]
    expect(sections).toHaveLength(3)
    expect(sections[0].title).toBe('Section 1')
    expect(sections[1].title).toBe('Section 2')
    expect(sections[2].title).toBe('Section 3')

    db.prepare('DELETE FROM projects WHERE id = ?').run(projectId)
  })
})

describe('References - Database operations', () => {
  let db: Database.Database
  let userId: string
  let projectId: string

  beforeAll(() => {
    db = getDb()
    userId = crypto.randomUUID()
    db.prepare(
      'INSERT INTO users (id, firstname, lastname, email, password, role) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId, 'Ref', 'Tester', `ref-${Date.now()}@test.com`, 'hash', 'student')
    projectId = crypto.randomUUID()
    db.prepare(`
      INSERT INTO projects (id, userId, title, level) VALUES (?, ?, ?, ?)
    `).run(projectId, userId, 'Test refs', 'doctorat')
  })

  it('should create a reference with authors', () => {
    const refId = crypto.randomUUID()
    db.prepare(`
      INSERT INTO references_table (id, projectId, type, title, year, publisher, format)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(refId, projectId, 'book', 'Test Book', 2024, 'Academic Press', 'apa')

    db.prepare('INSERT INTO reference_authors (id, referenceId, firstname, lastname) VALUES (?, ?, ?, ?)')
      .run(crypto.randomUUID(), refId, 'Jean', 'Dupont')
    db.prepare('INSERT INTO reference_authors (id, referenceId, firstname, lastname) VALUES (?, ?, ?, ?)')
      .run(crypto.randomUUID(), refId, 'Marie', 'Martin')

    const ref = db.prepare(`
      SELECT r.*, GROUP_CONCAT(ra.firstname || ' ' || ra.lastname, ', ') as authorsStr
      FROM references_table r
      LEFT JOIN reference_authors ra ON ra.referenceId = r.id
      WHERE r.id = ?
      GROUP BY r.id
    `).get(refId) as any
    expect(ref).toBeTruthy()
    expect(ref.title).toBe('Test Book')
    expect(ref.authorsStr).toContain('Jean Dupont')
    expect(ref.authorsStr).toContain('Marie Martin')

    db.prepare('DELETE FROM references_table WHERE id = ?').run(refId)
  })

  it('should cascade delete authors when reference is deleted', () => {
    const refId = crypto.randomUUID()
    db.prepare(`
      INSERT INTO references_table (id, projectId, type, title, year, format)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(refId, projectId, 'article', 'Test Article', 2023, 'apa')

    const authorId = crypto.randomUUID()
    db.prepare('INSERT INTO reference_authors (id, referenceId, firstname, lastname) VALUES (?, ?, ?, ?)')
      .run(authorId, refId, 'Paul', 'Test')

    db.prepare('DELETE FROM references_table WHERE id = ?').run(refId)
    const author = db.prepare('SELECT * FROM reference_authors WHERE id = ?').get(authorId)
    expect(author).toBeFalsy()
  })
})
