<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from './api'
import { toast } from './toast'

interface Project {
  emoji: string
  name: string
  zh: string
  en: string
  tech: string[]
  url: string
  date?: string
}

const projects = ref<Project[]>([])
const editing = ref(-1)
const form = ref<Project>({ emoji: '', name: '', zh: '', en: '', tech: [], url: '', date: '' })
const techInput = ref('')

const load = async () => {
  const res = await fetch(`${import.meta.env.BASE_URL}api/projects`)
  projects.value = await res.json()
}

const pick = (i: number) => {
  editing.value = i
  const p = projects.value[i]
  form.value = { emoji: p.emoji, name: p.name, zh: p.zh, en: p.en, tech: [...p.tech], url: p.url, date: p.date ?? '' }
  techInput.value = p.tech.join(', ')
}

const addNew = () => {
  projects.value.push({ emoji: '✨', name: 'New Project', zh: '', en: '', tech: [], url: '', date: '' })
  pick(projects.value.length - 1)
}

const persist = async () => api('/admin/projects', { method: 'PUT', body: JSON.stringify(projects.value) })

const save = async () => {
  if (editing.value < 0) return toast('未选择项目', false)
  projects.value[editing.value] = { ...form.value, tech: techInput.value.split(',').map(s => s.trim()).filter(Boolean) }
  const res = await persist()
  if (res.ok) toast('项目已保存 ✓')
  else toast('保存失败', false)
}

const remove = async () => {
  if (editing.value < 0) return toast('未选择项目', false)
  if (!confirm(`确定删除项目「${projects.value[editing.value].name}」？`)) return
  projects.value.splice(editing.value, 1)
  const res = await persist()
  if (res.ok) {
    editing.value = -1
    form.value = { emoji: '', name: '', zh: '', en: '', tech: [], url: '', date: '' }
    techInput.value = ''
    toast('已删除')
  } else toast('删除失败', false)
}

onMounted(load)
</script>

<template>
  <div>
    <div class="admin-toolbar">
      <h2>项目信息</h2>
      <span class="spacer" />
      <button class="admin-btn" @click="addNew">＋ 新项目</button>
    </div>

    <div class="admin-work">
      <div class="glass-card admin-list">
        <div
          v-for="(p, i) in projects"
          :key="i"
          class="admin-item"
          :class="{ active: i === editing }"
          @click="pick(i)"
        >
          <b>{{ p.emoji }} {{ p.name }}</b>
          <small>{{ p.date || '—' }} · {{ p.url }}</small>
        </div>
      </div>

      <div class="glass-card admin-panel">
        <div class="admin-toolbar">
          <button class="admin-btn sm" @click="save">保存项目</button>
          <button class="admin-btn danger sm" @click="remove">删除</button>
          <span class="hint">{{ editing >= 0 ? `编辑：${form.name || '#' + (editing + 1)}` : '未选择项目' }}</span>
        </div>
        <div class="admin-row">
          <div class="admin-field" style="max-width:110px"><label>Emoji</label><input v-model="form.emoji" placeholder="🥗" /></div>
          <div class="admin-field"><label>项目名称</label><input v-model="form.name" placeholder="FreshBite" /></div>
          <div class="admin-field" style="max-width:150px"><label>时间（如 2026-08）</label><input v-model="form.date" placeholder="2026-08" /></div>
        </div>
        <div class="admin-field"><label>链接</label><input v-model="form.url" placeholder="https://github.com/…" /></div>
        <div class="admin-field"><label>中文描述</label><input v-model="form.zh" /></div>
        <div class="admin-field"><label>英文描述</label><input v-model="form.en" /></div>
        <div class="admin-field"><label>技术标签（逗号分隔）</label><input v-model="techInput" placeholder="Vue 3, TypeScript, Vite" /></div>
      </div>
    </div>
  </div>
</template>
