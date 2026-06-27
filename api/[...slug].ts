import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = (await import('../backend/dist/index.js')).default
    app(req, res)
  } catch (err: any) {
    console.error('Handler error:', err?.message || err, err?.stack || '')
    res.status(500).json({
      error: 'Erreur interne',
      message: err?.message || String(err),
      stack: process.env.NODE_ENV !== 'production' ? err?.stack : undefined,
    })
  }
}
