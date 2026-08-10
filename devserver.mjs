import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import handler from './api/getij.js'

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const query = Object.fromEntries(url.searchParams.entries())

  if (url.pathname === '/api/getij') {
    const fakeReq = { query }
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

  if (url.pathname === '/' || url.pathname.endsWith('.html')) {
    const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1)
    try {
      const html = fs.readFileSync(path.join(process.cwd(), file))
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(html)
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
