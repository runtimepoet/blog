<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from './api'
import { toast } from './toast'

interface Img { name: string; orig?: string; size: number; uploaded: string }

const images = ref<Img[]>([])
const uploadInput = ref<HTMLInputElement>()
const imgBase = `${import.meta.env.BASE_URL}img/`.replace(/\/{2,}/g, '/')

const load = async () => {
  const list = (await (await api('/images')).json()) as Img[]
  images.value = list.sort((a, b) => (a.uploaded < b.uploaded ? 1 : -1))
}

const onUpload = async (e: Event) => {
  const files = [...((e.target as HTMLInputElement).files ?? [])]
  ;(e.target as HTMLInputElement).value = ''
  for (const f of files) {
    const res = await api(`/images?name=${encodeURIComponent(f.name)}`, { method: 'POST', body: f })
    if (!res.ok) toast(`${f.name} 上传失败`, false)
  }
  toast('上传完成 ✓')
  load()
}

const copyMd = async (img: Img) => {
  await navigator.clipboard.writeText(`![${img.orig || img.name}](${imgBase}${img.name})`)
  toast('已复制 ✓')
}

const remove = async (img: Img) => {
  if (!confirm(`删除 ${img.orig || img.name}？`)) return
  const res = await api(`/images/${img.name}`, { method: 'DELETE' })
  if (res.ok) {
    toast('已删除')
    load()
  } else toast('删除失败', false)
}

const kb = (n: number) => (n / 1024).toFixed(0) + ' KB'

onMounted(load)
</script>

<template>
  <div>
    <div class="admin-toolbar">
      <h2>图片</h2>
      <span class="spacer" />
      <button class="admin-btn" @click="uploadInput?.click()">＋ 上传图片</button>
      <input ref="uploadInput" type="file" accept="image/*" multiple hidden @change="onUpload" />
    </div>

    <div class="img-grid">
      <div v-for="img in images" :key="img.name" class="img-cell">
        <img :src="imgBase + img.name" loading="lazy" alt="" />
        <div class="meta" :title="img.orig || img.name">{{ img.orig || img.name }} · {{ kb(img.size) }}</div>
        <div class="ops">
          <button @click="copyMd(img)">复制 Markdown</button>
          <button @click="remove(img)">删除</button>
        </div>
      </div>
    </div>
    <p v-if="images.length === 0" class="hint" style="text-align:center;padding:3rem 0">
      还没有图片，点右上「上传图片」开始。
    </p>
  </div>
</template>
