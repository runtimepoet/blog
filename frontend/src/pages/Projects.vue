<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { t } from '../i18n'

interface Project {
  emoji: string
  name: string
  zh: string
  en: string
  tech: string[]
  url: string
  date?: string
}

const projects: Project[] = [
  {
    emoji: '🥗',
    name: 'FreshBite',
    zh: '一个简单的食物订购网页：React 19 + TypeScript 店面，ASP.NET Core 9 + FormCMS 无头后端，SQLite，单容器 Docker 部署。',
    en: 'A simple food-ordering web app: React 19 + TypeScript storefront, ASP.NET Core 9 + FormCMS headless backend, SQLite, single-container Docker deploy.',
    tech: ['React 19', 'TypeScript', 'ASP.NET Core', 'FormCMS', 'Docker'],
    url: 'https://github.com/runtimepoet/freshbite',
    date: '2026-08',
  },
  {
    emoji: '📝',
    name: 'runtimepoet · blog',
    zh: '你正在看的这个站：Vue 3 + Vite 驱动的 Markdown 博客，毛玻璃 UI，GitHub Pages 自动部署。',
    en: 'This very site: a Vue 3 + Vite Markdown blog with a glassmorphism UI, auto-deployed to GitHub Pages.',
    tech: ['Vue 3', 'TypeScript', 'Vite', 'GitHub Pages'],
    url: 'https://github.com/runtimepoet/blog',
    date: '2026-08',
  },
  {
    emoji: '🧩',
    name: 'FormCMS',
    zh: '开源无头 CMS：ASP.NET Core + React，REST / GraphQL 双 API，内置 GrapesJS 页面设计器。',
    en: 'Open-source headless CMS: ASP.NET Core + React, dual REST / GraphQL APIs, built-in GrapesJS page designer.',
    tech: ['C#', 'ASP.NET Core', 'React', 'GraphQL'],
    url: 'https://github.com/runtimepoet/formcms',
    date: '2025',
  },
  {
    emoji: '🔓',
    name: 'vuln-bite',
    zh: '故意留漏洞的食物订购靶场：3 个真实漏洞（硬编码凭证 / IDOR / 默认管理员密码），附攻击指南与修复分支，配合博客 writeup 形成攻防闭环。',
    en: 'A deliberately vulnerable FreshBite variant — 3 real vulnerabilities with exploit guides and fix branches. A security training ground.',
    tech: ['Security', 'React', 'ASP.NET Core', 'Docker'],
    url: 'https://github.com/runtimepoet/vuln-bite',
    date: '2026-08',
  },
  {
    emoji: '🪟',
    name: 'win-kernel-lab',
    zh: '原创 Windows 内核实验室：进程监控 / 内存读写 / ETW 仪表盘 / 文件过滤四个驱动级 PoC，全部 MSVC 实测编译通过。',
    en: 'Original Windows kernel lab — four compile-verified PoCs: process watch, memory RW, ETW live dashboard and a minifilter.',
    tech: ['C', 'C++', 'WDK', 'Kernel'],
    url: 'https://github.com/runtimepoet/win-kernel-lab',
    date: '2025',
  },
  {
    emoji: '🎬',
    name: 'vidhub',
    zh: '自托管视频床：流式上传、Range 分段秒播、独立播放页与嵌入码，Vue 3 + 零依赖 Node 单容器。',
    en: 'Self-hosted video bed — streaming uploads, Range/206 playback, player pages and embed codes. Vue 3 + zero-dep Node in one container.',
    tech: ['Vue 3', 'Node.js', 'Docker', 'Streaming'],
    url: 'https://github.com/runtimepoet/vidhub',
    date: '2026-08',
  },
]

const projectList = ref<Project[]>(projects)

onMounted(async () => {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}api/projects`)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length) projectList.value = data
    }
  } catch {
    /* static mirror: keep bundled list */
  }
})
</script>

<template>
  <div>
    <h1 class="page-title">{{ t('项目', 'Projects') }}</h1>
    <div class="project-grid">
      <div
        v-for="(p, i) in projectList"
        :key="p.name"
        class="glass-card project-card"
        :style="{ animationDelay: 0.08 + i * 0.08 + 's' }"
      >
        <div class="project-head">
          <span class="project-emoji">{{ p.emoji }}</span>
          <h2 class="project-name">{{ p.name }}</h2>
          <span v-if="p.date" class="project-date">{{ p.date }}</span>
        </div>
        <p class="project-desc">{{ t(p.zh, p.en) }}</p>
        <div class="project-tech">
          <span v-for="tech in p.tech" :key="tech" class="tech-chip">{{ tech }}</span>
        </div>
        <a :href="p.url" target="_blank" rel="noopener" class="project-link">{{ t('查看 →', 'View →') }}</a>
      </div>
    </div>
  </div>
</template>
