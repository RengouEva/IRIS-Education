let appPromise

module.exports = async function handler(req, res) {
  try {
    if (!appPromise) {
      appPromise = import('../backend/dist/index.js')
    }
    const mod = await appPromise
    mod.default(req, res)
  } catch (err) {
    console.error('API handler error:', err)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erreur serveur', detail: String(err) })
    }
  }
}
