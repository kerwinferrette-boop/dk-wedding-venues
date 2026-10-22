import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const SHEET_ID = '1JUtOiOq7kjNoVB8JEGysWZ7lm-TpVVlzEvnPNb6Q4z8'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'netlify-dev',
      configureServer(server) {
        // Serve any netlify/functions/<name>.js in dev the way Netlify would,
        // so POST-based functions can be exercised without `netlify dev`.
        // (fetch-sheet keeps its bespoke handler below — it predates this.)
        server.middlewares.use('/.netlify/functions', async (req, res, next) => {
          const name = (req.url || '').split('?')[0].replace(/^\//, '')
          if (!name || name === 'fetch-sheet') return next()
          let mod
          try {
            mod = await server.ssrLoadModule(`/netlify/functions/${name}.js`)
          } catch {
            return next()
          }
          const chunks = []
          for await (const c of req) chunks.push(c)
          try {
            const result = await mod.handler({
              httpMethod: req.method,
              body: Buffer.concat(chunks).toString('utf8'),
              headers: req.headers,
            })
            res.statusCode = result.statusCode ?? 200
            for (const [k, v] of Object.entries(result.headers || {})) res.setHeader(k, v)
            res.end(result.body ?? '')
          } catch (e) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: e.message }))
          }
        })

        server.middlewares.use('/.netlify/functions/fetch-sheet', async (req, res) => {
          const params = new URLSearchParams(req.url?.split('?')[1] || '')
          const sheet = params.get('sheet')
          const gid = params.get('gid') ?? '0'
          const url = sheet
            ? `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`
            : `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`
          try {
            const r = await fetch(url)
            const csv = await r.text()
            res.setHeader('Content-Type', 'text/csv')
            res.end(csv)
          } catch (e) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: e.message }))
          }
        })
      },
    },
  ],
})
