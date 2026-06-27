import type { VercelRequest, VercelResponse } from '@vercel/node'

export default function health(_req: VercelRequest, res: VercelResponse) {
  res.json({
    status: 'ok',
    env: {
      database_url: process.env.DATABASE_URL ? 'set' : 'not set',
      postgres_url: process.env.POSTGRES_URL ? 'set' : 'not set',
      postgres_url_non_pooling: process.env.POSTGRES_URL_NON_POOLING ? 'set' : 'not set',
      node: process.version,
      vercel: process.env.VERCEL || 'not set',
    },
  })
}
