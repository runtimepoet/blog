import { ref } from 'vue'
import MarkdownIt from 'markdown-it'
import { lang } from './i18n'

const md = new MarkdownIt({ html: true, linkify: true })

export interface Post {
  slug: string
  title: string
  /** Display date (ISO yyyy-mm-dd) */
  date: string
  updated?: string
  tags: string[]
  excerpt: string
  body: string
  html?: string
}

/** Minimal frontmatter parser: key: value pairs between --- fences. */
function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!m) return { meta: {}, body: raw }
  const meta: Record<string, string> = {}
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([\w-]+)\s*:\s*(.*)$/)
    if (kv) meta[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '')
  }
  return { meta, body: m[2].trim() }
}

function fromRaw(slug: string, raw: string): Post {
  const { meta, body } = parseFrontmatter(raw as string)
  return {
    slug,
    title: meta.title ?? slug,
    date: meta.date ?? '1970-01-01',
    updated: meta.updated,
    tags: (meta.tags ?? '')
      .replace(/[[\]]/g, '')
      .split(',')
      .map(t => t.trim())
      .filter(Boolean),
    excerpt:
      meta.excerpt ??
      body.replace(/[#*`>\[\]\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140) + '…',
    body,
  }
}

/** Posts bundled at build time — fallback so the static mirror keeps working. */
const bundled: Post[] = Object.entries(
  import.meta.glob('../posts/*.md', { query: '?raw', import: 'default', eager: true })
)
  .map(([path, raw]) => fromRaw(path.split('/').pop()!.replace(/\.md$/, ''), raw as string))
  .sort((a, b) => (a.date < b.date ? 1 : -1))

export const posts = ref<Post[]>(bundled)
export const source = ref<'api' | 'bundled'>('bundled')

/** Fetch posts from the API (self-hosted mode); silently keep bundled posts otherwise. */
export async function loadPosts(): Promise<void> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}api/posts?full=1`)
    if (!res.ok) throw new Error(String(res.status))
    const data = (await res.json()) as Post[]
    if (!Array.isArray(data) || data.length === 0) throw new Error('empty')
    posts.value = data.sort((a, b) => (a.date < b.date ? 1 : -1))
    source.value = 'api'
  } catch {
    posts.value = bundled
  }
}

export const getPost = (slug: string): Post | undefined => posts.value.find(p => p.slug === slug)

export const renderPost = (post: Post): string => (post.html ??= md.render(post.body))

/** "2026-08-05" -> "Aug 5, 2026"（英文浏览器）或 "2026年8月5日"（中文浏览器） */
export const formatDate = (iso: string): string => {
  const isZh = lang.value === 'zh'
  return new Date(`${iso}T00:00:00`).toLocaleDateString(isZh ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: isZh ? 'long' : 'short',
    day: 'numeric',
  })
}

/** Deterministic hue from a string, for generated card covers. */
export const coverHue = (seed: string): number => {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 360
  return h
}

const TAG_EMOJI: Record<string, string> = {
  kernel: '🪟',
  windows: '🪟',
  react: '⚛️',
  vue: '💚',
  meta: '📝',
  'aspnet-core': '🟪',
  docker: '🐳',
  formcms: '🧩',
  security: '🔐',
  go: '🐹',
}

export const tagEmoji = (tag?: string): string => TAG_EMOJI[tag ?? ''] ?? '📝'
