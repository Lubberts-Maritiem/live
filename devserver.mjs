import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import handler from './api/getij.js'

// Content-types voor de statische bestanden die devserver.mjs kan serveren.
// index.html is opgesplitst in losse CSS/JS-bestanden (zie PROJECT-OVERZICHT.md
// sectie 1) — deze server moet die dus ook kunnen uitleveren, niet alleen html.
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const query = Object.fromEntries(url.searchParams.entries())

  if (url.pathname === '/api/getij') {
    const fakeReq = { query, headers: req.headers }
    const fakeRes = {
      _status: 200,
      setHeader() {},
      status(code) { this._status = code; return this },
      json(payload) {
        res.writeHead(this._status, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(payload))
      },
    }
    await handler(fakeReq, fakeRes)
    return
  }

  const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1)
  const ext = path.extname(file)
  const contentType = CONTENT_TYPES[ext]

  if (contentType) {
    try {
      const body = fs.readFileSync(path.join(process.cwd(), file))
      res.writeHead(200, { 'Content-Type': contentType })
      res.end(body)
    } catch {
      res.writeHead(404); res.end('not found')
    }
    return
  }

  res.writeHead(404)
  res.end('not found')
})

server.listen(3001, () => {
  console.log('')
  console.log('  Server draait. Open in je browser:')
  console.log('  http://localhost:3001')
  console.log('')
  console.log('  Stoppen: Ctrl+C')
  console.log('')
})
