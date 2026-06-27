import express from 'express'
import db from './database.js'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDatabase } from './database.js'
import multer from 'multer'
import { uploadFile, isUsingBlob, getLocalUploadsPath } from './storage.js'

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

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION — Function would have crashed:', reason)
})

try {
  await initDatabase()
} catch (err) {
  console.error('Database init error:', err)
}

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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

app.post('/api/upload/audio', upload.single('audio'), async (req, res) => {
  if (!req.file) { res.status(400).json({ error: 'Fichier audio requis' }); return }
  const ext = req.file.mimetype === 'audio/webm' ? '.webm' : '.ogg'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
  try {
    const url = await uploadFile(req.file.buffer, filename, 'audio')
    res.json({ url, filename })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/upload/image', upload.single('image'), async (req, res) => {
  if (!req.file) { res.status(400).json({ error: 'Fichier image requis' }); return }
  const ext = path.extname(req.file.originalname) || '.jpg'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
  try {
    const url = await uploadFile(req.file.buffer, filename, 'images')
    res.json({ url, filename })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

if (!isUsingBlob()) {
  app.use('/uploads', express.static(getLocalUploadsPath('')))
}
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

app.get('/api/universities', async (_req, res) => {
  const universities = await db.all('SELECT * FROM universities ORDER BY name')
  res.json(universities)
})

app.get('/api/health', async (_req, res) => {
  try {
    const result = await db.get('SELECT 1 as alive')
    res.json({ status: 'ok', db: result?.alive === 1 ? 'connected' : 'error', timestamp: new Date().toISOString() })
  } catch (err: any) {
    res.json({ status: 'degraded', db: 'disconnected', error: err?.message || String(err), timestamp: new Date().toISOString() })
  }
})

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Erreur interne du serveur' })
})

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`IRIS-Education API running on http://localhost:${PORT}`)
  })
}

export default app
