import type { VercelRequest, VercelResponse } from '@vercel/node'

let handler: ((req: VercelRequest, res: VercelResponse) => Promise<void>) | null = null

export default async function apiHandler(req: VercelRequest, res: VercelResponse) {
  if (!handler) {
    try {
      const mod = await import('../backend/dist/index.js')
      const app = mod.default
      handler = (r: VercelRequest, s: VercelResponse) => {
        app(r as any, s as any)
      }
    } catch (err: any) {
      console.error('Handler init error:', err?.message || err)
      res.status(500).json({
        error: 'Erreur interne',
        debug: err?.message || String(err),
      })
      return
    }
  }
  handler(req, res)
}
