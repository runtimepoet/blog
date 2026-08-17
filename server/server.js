import http from 'node:http'
import {
  copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync,
  statSync, unlinkSync, writeFileSync,
} from 'node:fs'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID, createHash } from 'node:crypto'
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

const authed = req => {
  const tok = (req.headers.authorization || '').replace('Bearer ', '')
  const exp = tokens.get(tok)
  return !!exp && exp > Date.now()
}

const tokens = new Map() // token -> expiry ms

// ---------- helpers ----------
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

function send(res, code, body, type = 'application/json; charset=utf-8', headers = {}) {
  res.writeHead(code, { 'Content-Type': type, ...headers })
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body))
}

const readBody = (req, maxSize = 2_000_000) =>
  new Promise((resolve, reject) => {
    let data = ''
    req.on('data', c => {
      data += c
      if (data.length > maxSize) req.destroy()
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })

const readRawBody = (req, maxSize = 15_000_000) =>
  new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', c => {
      chunks.push(c)
      size += c.length
      if (size > maxSize) req.destroy()
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })

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
    const body = JSON.parse(await readBody(req).catch(() => '{}'))
    if (body.password !== ADMIN_PASSWORD) return send(res, 401, { error: 'unauthorized' })
    const token = randomUUID().replaceAll('-', '')
    tokens.set(token, Date.now() + 12 * 3600_000)
    return send(res, 200, { token })
  }

  if (path === '/api/admin/check')
    return authed(req) ? send(res, 200, { ok: true }) : send(res, 401, { error: 'unauthorized' })

  const adminPost = path.match(/^\/api\/admin\/posts\/([a-z0-9-]+)$/)
  if (adminPost && req.method === 'PUT') {
    if (!authed(req)) return send(res, 401, { error: 'unauthorized' })
    const slug = adminPost[1]
    if (!VALID_SLUG.test(slug)) return send(res, 400, { error: 'invalid slug' })
    const p = JSON.parse(await readBody(req))
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
    const raw = await readBody(req)
    let arr
    try {
      arr = JSON.parse(raw)
      if (!Array.isArray(arr)) throw new Error('not an array')
    } catch {
      return send(res, 400, { error: 'invalid JSON' })
    }
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
    const file = join(IMAGES_DIR, imgDel[1])
    if (existsSync(file)) unlinkSync(file)
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
      const path = decodeURIComponent(url.pathname)

      if (path.startsWith('/api/')) return await handleApi(req, res, path, url)

      // image bed: content-addressed names are immutable → cache forever
      if (path.startsWith('/img/')) {
        const name = path.slice(5)
        if (!/^[\w.-]+$/.test(name)) return send(res, 400, 'bad name', 'text/plain')
        const file = join(IMAGES_DIR, name)
        if (!existsSync(file)) return send(res, 404, 'not found', 'text/plain')
        return send(res, 200, readFileSync(file),
          MIME[extname(file).toLowerCase()] || 'application/octet-stream',
          { 'Cache-Control': 'public, max-age=31536000, immutable' })
      }

      // static + SPA fallback
      let file = normalize(join(WWWROOT, path))
      if (!file.startsWith(WWWROOT)) return send(res, 403, 'forbidden', 'text/plain')
      if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
      if (!existsSync(file) || !statSync(file).isFile()) {
        if (extname(path)) return send(res, 404, 'not found', 'text/plain')
        file = join(WWWROOT, 'index.html')
      }
      const ext = extname(file).toLowerCase()
      const cache = path.startsWith('/assets/')
        ? 'public, max-age=31536000, immutable'   // hashed build artifacts
        : ext === '.js' || ext === '.css'
          ? 'public, max-age=86400'                // admin page libs etc.
          : 'no-cache'                             // html and everything else
      send(res, 200, readFileSync(file), MIME[ext] || 'application/octet-stream', { 'Cache-Control': cache })
    } catch (err) {
      send(res, 500, { error: 'internal' })
      console.error(err)
    }
  })
  .listen(PORT, () => console.log(`blog server on :${PORT}, data at ${DATA_DIR}`))
