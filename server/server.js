import http from 'node:http'
import {
  copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync,
  statSync, unlinkSync, writeFileSync,
} from 'node:fs'
import { dirname, extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID, createHash, timingSafeEqual } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'

const ROOT = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 8080)
const DATA_DIR = process.env.DATA_DIR || join(ROOT, 'data')
const POSTS_DIR = join(DATA_DIR, 'posts')          // legacy file storage (imported once, then unused)
const PROJECTS_FILE = join(DATA_DIR, 'projects.json')
const IMAGES_DIR = join(DATA_DIR, 'images')
const IMAGES_META = join(DATA_DIR, 'images.json')
const WWWROOT = join(ROOT, 'wwwroot')
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-me'
// X-Forwarded-For is client-controlled; only believe it when running behind a proxy we own.
const TRUST_PROXY = process.env.TRUST_PROXY === '1'

if (ADMIN_PASSWORD === 'change-me')
  console.warn('[warn] ADMIN_PASSWORD is not set — the admin panel is using the documented default password.')

mkdirSync(POSTS_DIR, { recursive: true })
mkdirSync(IMAGES_DIR, { recursive: true })

const loadImageMeta = () => (existsSync(IMAGES_META) ? JSON.parse(readFileSync(IMAGES_META, 'utf8')) : {})
const saveImageMeta = m => writeFileSync(IMAGES_META, JSON.stringify(m, null, 2))

// ---------- database ----------
const db = new DatabaseSync(join(DATA_DIR, 'blog.db'))
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    slug    TEXT PRIMARY KEY,
    title   TEXT NOT NULL,
    date    TEXT NOT NULL,
    updated TEXT,
    tags    TEXT NOT NULL DEFAULT '[]',
    excerpt TEXT,
    body    TEXT NOT NULL
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    emoji   TEXT,
    name    TEXT NOT NULL,
    zh      TEXT,
    en      TEXT,
    tech    TEXT NOT NULL DEFAULT '[]',
    url     TEXT,
    date    TEXT,
    sort    INTEGER NOT NULL DEFAULT 0
  )
`)

// ---------- markdown frontmatter ----------
function parse(raw) {
  const meta = {}
  if (raw.startsWith('---')) {
    const end = raw.indexOf('\n---', 3)
    if (end > 0) {
      for (const line of raw.slice(3, end).split('\n')) {
        const i = line.indexOf(':')
        if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '')
      }
      raw = raw.slice(end + 4)
    }
  }
  return { meta, body: raw.trim() }
}

const parseTags = meta =>
  meta.tags ? meta.tags.replace(/[[\]]/g, '').split(',').map(s => s.trim()).filter(Boolean) : []

const autoExcerpt = body =>
  body.replace(/[#*`>\[\]\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140) + '…'

function importMarkdown(file) {
  const { meta, body } = parse(readFileSync(file, 'utf8'))
  const slug = file.split(/[\\/]/).pop().replace(/\.md$/, '')
  db.prepare(
    'INSERT OR IGNORE INTO posts (slug, title, date, updated, tags, excerpt, body) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    slug,
    meta.title || slug,
    meta.date || '',
    meta.updated || null,
    JSON.stringify(parseTags(meta)),
    meta.excerpt || autoExcerpt(body),
    body
  )
}

// ---------- first-run seed (and legacy file import) ----------
{
  const count = db.prepare('SELECT COUNT(*) AS n FROM posts').get().n
  if (count === 0) {
    if (existsSync(POSTS_DIR)) {
      for (const f of readdirSync(POSTS_DIR).filter(f => f.endsWith('.md')))
        importMarkdown(join(POSTS_DIR, f))
    }
    const seedDir = join(ROOT, 'seed')
    if (existsSync(seedDir)) {
      for (const f of readdirSync(seedDir).filter(f => f.endsWith('.md')))
        importMarkdown(join(seedDir, f))
    }
  }

  // projects: DB first; import legacy JSON / seed when empty
  const pCount = db.prepare('SELECT COUNT(*) AS n FROM projects').get().n
  if (pCount === 0) {
    const seedDir = join(ROOT, 'seed')
    const source = existsSync(PROJECTS_FILE)
      ? PROJECTS_FILE
      : existsSync(join(seedDir, 'projects.json'))
        ? join(seedDir, 'projects.json')
        : null
    if (source) {
      const arr = JSON.parse(readFileSync(source, 'utf8'))
      const ins = db.prepare(
        'INSERT INTO projects (emoji, name, zh, en, tech, url, date, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      arr.forEach((p, i) =>
        ins.run(p.emoji || '', p.name || '', p.zh || '', p.en || '',
                JSON.stringify(p.tech || []), p.url || '', p.date || '', i)
      )
    }
  }
}

const VALID_SLUG = /^[a-z0-9][a-z0-9-]*$/

const listPosts = () =>
  db.prepare('SELECT slug, title, date, updated, tags, excerpt, body FROM posts ORDER BY date DESC')
    .all()
    .map(r => ({ ...r, tags: JSON.parse(r.tags || '[]') }))

const getPost = slug => {
  const r = db.prepare('SELECT slug, title, date, updated, tags, excerpt, body FROM posts WHERE slug = ?').get(slug)
  return r ? { ...r, tags: JSON.parse(r.tags || '[]') } : null
}

// ---------- auth ----------
const TOKEN_TTL_MS = 12 * 3600_000
const LOGIN_MAX_FAILS = 8            // consecutive failures before the lockout kicks in
const LOGIN_LOCKOUT_MS = 15 * 60_000
const LOGIN_FAIL_DELAY_MS = 300      // fixed cost per wrong guess

const tokens = new Map()             // token -> expiry ms
const loginFails = new Map()         // client -> { count, until, seen }

// both maps are keyed by unbounded input, so drop what has aged out
const sweep = () => {
  const now = Date.now()
  for (const [tok, exp] of tokens) if (exp <= now) tokens.delete(tok)
  for (const [key, f] of loginFails)
    if (f.until <= now && now - f.seen > LOGIN_LOCKOUT_MS) loginFails.delete(key)
}
setInterval(sweep, 10 * 60_000).unref()

const authed = req => {
  const tok = (req.headers.authorization || '').replace('Bearer ', '')
  const exp = tokens.get(tok)
  if (!exp) return false
  if (exp <= Date.now()) {
    tokens.delete(tok)
    return false
  }
  return true
}

// A single IPv6 customer usually holds a whole /64, so throttling the exact
// address would hand an attacker 2^64 free buckets. Key on the prefix instead.
const addrKey = addr => {
  if (!addr) return 'unknown'
  const ip = addr.replace(/^::ffff:/, '')          // IPv4-mapped IPv6
  if (!ip.includes(':')) return ip
  const [head, tail = ''] = ip.split('::')
  const h = head ? head.split(':') : []
  const t = tail ? tail.split(':') : []
  const groups = [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t]
  return groups.slice(0, 4).map(g => (g || '0').toLowerCase()).join(':') + '::/64'
}

const clientKey = req => {
  if (TRUST_PROXY) {
    const xff = req.headers['x-forwarded-for']
    if (xff) {
      // Take the LAST entry, not the first: a proxy appends the peer it actually
      // saw, so everything to its left is whatever the client chose to send.
      // Trusting the leftmost entry lets an attacker rotate it to dodge the
      // throttle, or forge a victim's address to lock them out.
      const hops = String(xff).split(',')
      const nearest = hops[hops.length - 1].trim()
      if (nearest) return addrKey(nearest)
    }
  }
  return addrKey(req.socket.remoteAddress)
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

// hash both sides first: equal-length inputs, so neither length nor content leaks via timing
const passwordMatches = supplied =>
  timingSafeEqual(
    createHash('sha256').update(String(supplied ?? '')).digest(),
    createHash('sha256').update(ADMIN_PASSWORD).digest()
  )

// ---------- helpers ----------
class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
}

// Post bodies are admin-authored Markdown rendered with markdown-it's html:true
// and injected via v-html — so raw <img onerror>, inline <script> and
// javascript: URLs reach the DOM verbatim. Omitting 'unsafe-inline' from
// script-src makes the browser refuse to run every one of them, while the
// hashed Vite bundle (a same-origin external script) still loads. style-src
// keeps 'unsafe-inline' because Vue injects scoped styles that way.
const HTML_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

function send(res, code, body, type = 'application/json; charset=utf-8', headers = {}) {
  if (res.headersSent || res.writableEnded) return
  res.writeHead(code, { 'Content-Type': type, ...SECURITY_HEADERS, ...headers })
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body))
}

const parseJson = (raw, fallback) => {
  try {
    return JSON.parse(raw)
  } catch {
    if (fallback !== undefined) return fallback
    throw new HttpError(400, 'invalid JSON')
  }
}

const MAX_JSON_BODY = 2_000_000
const MAX_UPLOAD_BODY = 15_000_000

// Always settles. Destroying an over-sized request fires neither 'end' nor
// (reliably) 'error', which would otherwise leave this promise — and every byte
// buffered so far — pending for the lifetime of the process.
const collectBody = (req, maxSize) =>
  new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    let settled = false

    const cleanup = () => {
      req.off('data', onData)
      req.off('end', onEnd)
      req.off('error', onError)
      req.off('close', onClose)
    }
    const settle = fn => {
      if (settled) return
      settled = true
      cleanup()
      fn()
    }
    function onData(c) {
      size += c.length
      if (size > maxSize) {
        req.pause()
        return settle(() => reject(new HttpError(413, 'payload too large')))
      }
      chunks.push(c)
    }
    function onEnd() {
      settle(() => resolve(Buffer.concat(chunks)))
    }
    function onError(err) {
      // a peer that vanishes mid-request is a client event, not a server fault:
      // logging a stack trace for each one lets anyone flood the logs
      settle(() => reject(err?.code === 'ECONNRESET' ? new HttpError(400, 'request aborted') : err))
    }
    function onClose() {
      settle(() => reject(new HttpError(400, 'request closed before it finished')))
    }

    req.on('data', onData)
    req.on('end', onEnd)
    req.on('error', onError)
    req.on('close', onClose)
  })

// Decode once, at the end: a multi-byte character split across two chunks
// decodes to U+FFFD if each chunk is stringified on its own.
const readBody = async (req, maxSize = MAX_JSON_BODY) =>
  (await collectBody(req, maxSize)).toString('utf8')

const readRawBody = (req, maxSize = MAX_UPLOAD_BODY) => collectBody(req, maxSize)

// ---------- API ----------
async function handleApi(req, res, path, url) {
  if (path === '/api/posts' && req.method === 'GET') {
    const list = listPosts()
    // summaries by default; ?full=1 includes markdown bodies (the blog frontend uses this)
    return send(res, 200, url.searchParams.has('full') ? list : list.map(({ body, ...rest }) => rest))
  }

  const postMatch = path.match(/^\/api\/posts\/([a-z0-9-]+)$/)
  if (postMatch && req.method === 'GET') {
    const post = getPost(postMatch[1])
    return post ? send(res, 200, post) : send(res, 404, { error: 'not found' })
  }

  if (path === '/api/projects' && req.method === 'GET') {
    const rows = db.prepare('SELECT emoji, name, zh, en, tech, url, date FROM projects ORDER BY sort, id').all()
    return send(res, 200, rows.map(r => ({ ...r, tech: JSON.parse(r.tech || '[]') })))
  }

  if (path === '/api/login' && req.method === 'POST') {
    const key = clientKey(req)
    const now = Date.now()
    const fail = loginFails.get(key)
    if (fail && fail.until > now)
      return send(res, 429, { error: 'too many attempts' }, 'application/json; charset=utf-8',
        { 'Retry-After': String(Math.ceil((fail.until - now) / 1000)) })

    const body = parseJson(await readBody(req, 4_000), {})
    if (!passwordMatches(body?.password)) {
      // re-read after the await: the entry may have moved on while the body arrived
      const current = loginFails.get(key)
      const count = (current?.count ?? 0) + 1
      const locked = count >= LOGIN_MAX_FAILS
      loginFails.set(key, {
        count: locked ? 0 : count,
        until: locked ? Date.now() + LOGIN_LOCKOUT_MS : 0,
        seen: Date.now(),
      })
      // a fixed cost per wrong guess: caps the rate even for an attacker who can
      // rotate whatever we key on (a wide IPv6 block, say) and never gets locked
      await sleep(LOGIN_FAIL_DELAY_MS)
      return send(res, 401, { error: 'unauthorized' })
    }
    loginFails.delete(key)
    const token = randomUUID().replaceAll('-', '')
    tokens.set(token, Date.now() + TOKEN_TTL_MS)
    return send(res, 200, { token })
  }

  if (path === '/api/admin/check' && req.method === 'GET')
    return authed(req) ? send(res, 200, { ok: true }) : send(res, 401, { error: 'unauthorized' })

  const adminPost = path.match(/^\/api\/admin\/posts\/([a-z0-9-]+)$/)
  if (adminPost && req.method === 'PUT') {
    if (!authed(req)) return send(res, 401, { error: 'unauthorized' })
    const slug = adminPost[1]
    if (!VALID_SLUG.test(slug)) return send(res, 400, { error: 'invalid slug' })
    const p = parseJson(await readBody(req))
    if (!p || typeof p !== 'object' || Array.isArray(p))
      return send(res, 400, { error: 'expected an object' })
    if (!p.title || !p.date) return send(res, 400, { error: 'title and date are required' })
    db.prepare(
      `INSERT INTO posts (slug, title, date, updated, tags, excerpt, body)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(slug) DO UPDATE SET
         title=excluded.title, date=excluded.date, updated=excluded.updated,
         tags=excluded.tags, excerpt=excluded.excerpt, body=excluded.body`
    ).run(
      slug, p.title, p.date, p.updated || null,
      JSON.stringify(p.tags || []), p.excerpt || autoExcerpt(p.body || ''), p.body || ''
    )
    return send(res, 200, { ok: true })
  }

  if (adminPost && req.method === 'DELETE') {
    if (!authed(req)) return send(res, 401, { error: 'unauthorized' })
    const info = db.prepare('DELETE FROM posts WHERE slug = ?').run(adminPost[1])
    return info.changes > 0 ? send(res, 200, { ok: true }) : send(res, 404, { error: 'not found' })
  }

  if (path === '/api/admin/projects' && req.method === 'PUT') {
    if (!authed(req)) return send(res, 401, { error: 'unauthorized' })
    const arr = parseJson(await readBody(req))
    if (!Array.isArray(arr)) return send(res, 400, { error: 'expected an array' })
    if (arr.some(p => !p || typeof p !== 'object' || Array.isArray(p)))
      return send(res, 400, { error: 'every entry must be an object' })
    db.exec('BEGIN')
    try {
      db.exec('DELETE FROM projects')
      const ins = db.prepare(
        'INSERT INTO projects (emoji, name, zh, en, tech, url, date, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      arr.forEach((p, i) =>
        ins.run(p.emoji || '', p.name || '', p.zh || '', p.en || '',
                JSON.stringify(p.tech || []), p.url || '', p.date || '', i)
      )
      db.exec('COMMIT')
    } catch (err) {
      db.exec('ROLLBACK')
      throw err
    }
    return send(res, 200, { ok: true })
  }

  // ---------- image bed ----------
  if (path === '/api/images' && req.method === 'GET') {
    // filenames and upload times are admin metadata; the images themselves stay public under /img/
    if (!authed(req)) return send(res, 401, { error: 'unauthorized' })
    const meta = loadImageMeta()
    return send(res, 200, Object.entries(meta).map(([name, m]) => ({ name, ...m })))
  }

  if (path === '/api/images' && req.method === 'POST') {
    if (!authed(req)) return send(res, 401, { error: 'unauthorized' })
    const orig = (url.searchParams.get('name') || 'image.png').replace(/[^\w.-]/g, '_')
    const buf = await readRawBody(req)
    if (!buf.length) return send(res, 400, { error: 'empty body' })
    const ext = (orig.match(/\.(\w{2,5})$/)?.[1] || 'png').toLowerCase()
    if (!['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif'].includes(ext))
      return send(res, 400, { error: 'unsupported type' })
    const hash = createHash('sha256').update(buf).digest('hex').slice(0, 16)
    const name = `${hash}.${ext}`
    const file = join(IMAGES_DIR, name)
    if (!existsSync(file)) writeFileSync(file, buf) // content-addressed: same bytes = same name
    const meta = loadImageMeta()
    meta[name] = { orig, size: buf.length, uploaded: new Date().toISOString() }
    saveImageMeta(meta)
    return send(res, 200, { name, url: `/img/${name}`, size: buf.length })
  }

  const imgDel = path.match(/^\/api\/images\/([\w.-]+)$/)
  if (imgDel && req.method === 'DELETE') {
    if (!authed(req)) return send(res, 401, { error: 'unauthorized' })
    if (imgDel[1].includes('..')) return send(res, 400, { error: 'bad name' })
    const file = join(IMAGES_DIR, imgDel[1])
    if (existsSync(file) && statSync(file).isFile()) unlinkSync(file)
    const meta = loadImageMeta()
    delete meta[imgDel[1]]
    saveImageMeta(meta)
    return send(res, 200, { ok: true })
  }

  return send(res, 404, { error: 'not found' })
}

// ---------- server ----------
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://x')
      let path
      try {
        path = decodeURIComponent(url.pathname)
      } catch {
        return send(res, 400, 'bad request', 'text/plain')
      }

      if (path.startsWith('/api/')) return await handleApi(req, res, path, url)

      // image bed: content-addressed names are immutable → cache forever
      if (path.startsWith('/img/')) {
        const name = path.slice(5)
        if (!/^[\w.-]+$/.test(name) || name.includes('..'))
          return send(res, 400, 'bad name', 'text/plain')
        const file = join(IMAGES_DIR, name)
        if (!existsSync(file) || !statSync(file).isFile())
          return send(res, 404, 'not found', 'text/plain')
        const ext = extname(file).toLowerCase()
        // an SVG is a document, not just pixels: sandbox it so an uploaded one
        // can never run script on this origin when opened directly
        const svgGuard = ext === '.svg'
          ? { 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox" }
          : {}
        return send(res, 200, readFileSync(file), MIME[ext] || 'application/octet-stream',
          { 'Cache-Control': 'public, max-age=31536000, immutable', ...svgGuard })
      }

      // static + SPA fallback
      let file = normalize(join(WWWROOT, path))
      // the separator matters: a bare prefix test also accepts siblings such as
      // "<wwwroot>-backup", which percent-encoded slashes can still reach
      if (file !== WWWROOT && !file.startsWith(WWWROOT + sep))
        return send(res, 403, 'forbidden', 'text/plain')
      if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
      if (!existsSync(file) || !statSync(file).isFile()) {
        if (extname(path)) return send(res, 404, 'not found', 'text/plain')
        file = join(WWWROOT, 'index.html')
        // no frontend build present (API-only run): say so instead of throwing
        if (!existsSync(file))
          return send(res, 404, 'frontend build not found — run `npm run build` in frontend/', 'text/plain')
      }
      const ext = extname(file).toLowerCase()
      const cache = path.startsWith('/assets/')
        ? 'public, max-age=31536000, immutable'   // hashed build artifacts
        : ext === '.js' || ext === '.css'
          ? 'public, max-age=86400'                // admin page libs etc.
          : 'no-cache'                             // html and everything else
      // the CSP only matters on the documents that render post bodies
      const csp = ext === '.html' ? { 'Content-Security-Policy': HTML_CSP } : {}
      send(res, 200, readFileSync(file), MIME[ext] || 'application/octet-stream', { 'Cache-Control': cache, ...csp })
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500
      if (status >= 500) console.error(err)
      send(res, status, { error: status >= 500 ? 'internal' : err.message })
      if (status === 413) req.destroy()   // stop the client mid-upload
    }
  })
  .listen(PORT, () => console.log(`blog server on :${PORT}, data at ${DATA_DIR}`))
