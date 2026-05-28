import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const SHEET_ID = '1JUtOiOq7kjNoVB8JEGysWZ7lm-TpVVlzEvnPNb6Q4z8'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'netlify-dev',
      configureServer(server) {
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
