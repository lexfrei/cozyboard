import { file, serve } from 'bun'
import { resolve, join } from 'node:path'

const PORT = Number(process.env.PORT ?? '8080')
const DIST = resolve(import.meta.dir, 'dist')

async function proxyOAuth(req: Request, upstreamPath: string): Promise<Response> {
  const body = await req.text()
  const upstream = await fetch(`https://github.com${upstreamPath}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'cozyboard',
    },
    body,
  })
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function tryFile(path: string): Promise<Response | null> {
  const full = join(DIST, path)
  // Guard against path traversal: must stay inside DIST.
  if (!full.startsWith(DIST + '/') && full !== DIST) return null
  const f = file(full)
  if (!(await f.exists())) return null
  return new Response(f)
}

serve({
  port: PORT,
  hostname: '0.0.0.0',
  async fetch(req): Promise<Response> {
    const url = new URL(req.url)

    if (url.pathname === '/api/oauth/device' && req.method === 'POST') {
      return proxyOAuth(req, '/login/device/code')
    }
    if (url.pathname === '/api/oauth/token' && req.method === 'POST') {
      return proxyOAuth(req, '/login/oauth/access_token')
    }

    if (url.pathname === '/api/health') {
      return new Response('ok', { status: 200 })
    }

    const requested = url.pathname === '/' ? '/index.html' : url.pathname
    const direct = await tryFile(requested)
    if (direct) return direct

    // SPA fallback for client-side routes.
    const fallback = await tryFile('/index.html')
    if (fallback) return fallback

    return new Response('not found', { status: 404 })
  },
})

console.log(`cozyboard listening on :${PORT.toString()}`)
