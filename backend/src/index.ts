import express from 'express'
import db from './database.js'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDatabase } from './database.js'
import multer from 'multer'

import authRoutes from './routes/auth.js'
import projectRoutes from './routes/projects.js'
import templateRoutes from './routes/templates.js'
import referenceRoutes from './routes/references.js'
import commentRoutes from './routes/comments.js'
import versionRoutes from './routes/versions.js'
import adminRoutes from './routes/admin.js'
import exportRoutes from './routes/export.js'
import aiRoutes from './routes/ai.js'
import notificationRoutes from './routes/notifications.js'
import shareRoutes from './routes/shares.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

initDatabase()

const app = express()
const PORT = process.env.PORT || 4000
const CORS_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000').split(',')

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' },
})

app.use(helmet())
app.use(limiter)
app.use(cors({ origin: CORS_ORIGINS, credentials: true }))
app.use(express.json({ limit: '50mb' }))

const audioStorage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads', 'audio'),
  filename: (_req, file, cb) => {
    const ext = file.mimetype === 'audio/webm' ? '.webm' : '.ogg'
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  },
})
const uploadAudio = multer({
  storage: audioStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) cb(null, true)
    else cb(new Error('Format audio non supporté'))
  },
})

app.post('/api/upload/audio', uploadAudio.single('audio'), (req, res) => {
  if (!req.file) { res.status(400).json({ error: 'Fichier audio requis' }); return }
  const url = `/uploads/audio/${req.file.filename}`
  res.json({ url, filename: req.file.filename })
})

const imageStorage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads', 'images'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg'
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  },
})
const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Format image non supporté'))
  },
})

app.post('/api/upload/image', (req, res) => {
  uploadImage.single('image')(req, res, (err) => {
    if (err) { res.status(400).json({ error: err.message }); return }
    if (!req.file) { res.status(400).json({ error: 'Fichier image requis' }); return }
    const url = `/uploads/images/${req.file.filename}`
    res.json({ url, filename: req.file.filename })
  })
})

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))
app.use('/images', express.static(path.join(__dirname, '..', '..', 'app', 'public', 'images')))

app.use('/api/auth', authRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/templates', templateRoutes)
app.use('/api/references', referenceRoutes)
app.use('/api/comments', commentRoutes)
app.use('/api/versions', versionRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/export', exportRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/shares', shareRoutes)

app.get('/api/universities', (_req, res) => {
  const universities = db.prepare('SELECT * FROM universities ORDER BY name').all()
  res.json(universities)
})

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`IRIS-Education API running on http://localhost:${PORT}`)
})
