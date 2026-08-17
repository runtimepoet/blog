<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import MarkdownIt from 'markdown-it'
import { api } from './api'
import { toast } from './toast'

const md = new MarkdownIt({ html: true, linkify: true })
const CATEGORIES = ['WebDev', 'WebSafety', 'SystemKernel', 'SystemKernelSafety', 'Gadgets']

interface Summary { slug: string; title: string; date: string; tags: string[] }

const list = ref<Summary[]>([])
const editingSlug = ref<string | null>(null)
const slug = ref('')
const title = ref('')
const date = ref('')
const updated = ref('')
const cats = ref<string[]>([])
const excerpt = ref('')
const body = ref('')

const preview = computed(() => md.render(body.value || ''))
const hint = computed(() => (editingSlug.value ? `编辑：${editingSlug.value}` : slug.value ? `新文章：${slug.value}` : '未选择文章'))

const loadList = async () => {
  list.value = await (await api('/posts')).json()
}

const loadPost = async (s: string) => {
  const p = await (await api(`/posts/${s}`)).json()
  editingSlug.value = p.slug
  slug.value = p.slug
  title.value = p.title
  date.value = p.date
  updated.value = p.updated || ''
  cats.value = p.tags || []
  excerpt.value = p.excerpt || ''
  body.value = p.body || ''
}

const reset = () => {
  editingSlug.value = null
  slug.value = ''
  title.value = ''
  date.value = new Date().toISOString().slice(0, 10)
  updated.value = ''
  cats.value = []
  excerpt.value = ''
  body.value = ''
}

const onTitle = () => {
  if (!editingSlug.value)
    slug.value = title.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

const toggleCat = (c: string) => {
  const i = cats.value.indexOf(c)
  if (i >= 0) cats.value.splice(i, 1)
  else cats.value.push(c)
}

const save = async () => {
  const s = editingSlug.value || slug.value.trim()
  if (!/^[a-z0-9][a-z0-9-]*$/.test(s)) return toast('slug 只能是小写字母/数字/连字符', false)
  if (!title.value.trim() || !date.value) return toast('标题和日期必填', false)
  const res = await api(`/admin/posts/${s}`, {
    method: 'PUT',
    body: JSON.stringify({
      title: title.value.trim(),
      date: date.value,
      updated: updated.value || null,
      tags: cats.value,
      excerpt: excerpt.value.trim() || null,
      body: body.value,
    }),
  })
  if (res.ok) {
    editingSlug.value = s
    toast('已发布 ✓')
    loadList()
  } else toast('保存失败', false)
}

const remove = async () => {
  if (!editingSlug.value) return toast('未选择文章', false)
  if (!confirm(`确定删除 ${editingSlug.value}？此操作不可撤销。`)) return
  const res = await api(`/admin/posts/${editingSlug.value}`, { method: 'DELETE' })
  if (res.ok) {
    toast('已删除')
    reset()
    loadList()
  } else toast('删除失败', false)
}

// image upload → insert markdown at cursor
const fileInput = ref<HTMLInputElement>()
const bodyArea = ref<HTMLTextAreaElement>()
const pickImage = () => fileInput.value?.click()
const onImage = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (!file) return
  const res = await api(`/images?name=${encodeURIComponent(file.name)}`, {
    method: 'POST',
    body: file,
  })
  if (!res.ok) return toast('上传失败', false)
  const { url } = await res.json()
  const ta = bodyArea.value!
  const mdText = `![${file.name.replace(/\.[^.]+$/, '')}](${url})`
  const pos = ta.selectionStart ?? ta.value.length
  body.value = ta.value.slice(0, pos) + mdText + ta.value.slice(pos)
  toast('图片已插入 ✓')
}

onMounted(() => {
  reset()
  loadList()
})
</script>

<template>
  <div>
    <div class="admin-toolbar">
      <h2>文章管理</h2>
      <span class="spacer" />
      <button class="admin-btn" @click="reset">＋ 新文章</button>
    </div>

    <div class="admin-work">
      <div class="glass-card admin-list">
        <div
          v-for="p in list"
          :key="p.slug"
          class="admin-item"
          :class="{ active: p.slug === editingSlug }"
          @click="loadPost(p.slug)"
        >
          <b>{{ p.title }}</b>
          <small>{{ p.date }} · {{ p.slug }}</small><br />
          <span v-for="tg in p.tags" :key="tg" class="cat" style="display:inline-block;margin-top:.25rem;padding:.05rem .5rem;border-radius:6px;font-size:.68rem;font-weight:700;background:rgba(139,92,246,.25);color:#c4b5fd">{{ tg }}</span>
        </div>
      </div>

      <div class="glass-card admin-panel">
        <div class="admin-toolbar">
          <button class="admin-btn sm" @click="save">保存发布</button>
          <button class="admin-btn ghost sm" @click="pickImage">🖼️ 插图</button>
          <input ref="fileInput" type="file" accept="image/*" hidden @change="onImage" />
          <button class="admin-btn danger sm" @click="remove">删除</button>
          <span class="hint">{{ hint }}</span>
        </div>

        <div class="admin-row">
          <div class="admin-field"><label>Slug（URL）</label><input v-model="slug" :disabled="!!editingSlug" placeholder="my-post" /></div>
          <div class="admin-field"><label>发布日期</label><input v-model="date" type="date" /></div>
          <div class="admin-field"><label>更新日期（可空）</label><input v-model="updated" type="date" /></div>
        </div>
        <div class="admin-field"><label>标题</label><input v-model="title" placeholder="文章标题" @input="onTitle" /></div>
        <div class="admin-field">
          <label>分类标签</label>
          <div class="cat-chips">
            <button
              v-for="c in CATEGORIES"
              :key="c"
              type="button"
              class="cat-chip-btn"
              :class="{ on: cats.includes(c) }"
              @click="toggleCat(c)"
            >{{ c }}</button>
          </div>
        </div>
        <div class="admin-field"><label>摘要（可空，自动生成）</label><input v-model="excerpt" /></div>
        <div class="editor-grid">
          <div class="admin-field"><label>正文（Markdown）</label><textarea ref="bodyArea" v-model="body"></textarea></div>
          <div class="admin-field"><label>实时预览</label><div class="admin-preview" v-html="preview" /></div>
        </div>
      </div>
    </div>
  </div>
</template>
