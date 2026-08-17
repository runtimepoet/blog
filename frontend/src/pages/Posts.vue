<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '../i18n'
import { formatDate, posts } from '../posts'

const CATEGORIES = ['WebDev', 'WebSafety', 'SystemKernel', 'SystemKernelSafety', 'Gadgets']

const activeTag = ref<string | null>(null)

const counts = computed(() => {
  const map: Record<string, number> = {}
  for (const c of CATEGORIES) map[c] = 0
  for (const p of posts.value) {
    for (const tag of p.tags) if (tag in map) map[tag]++
  }
  return map
})

const filtered = computed(() =>
  activeTag.value ? posts.value.filter(p => p.tags.includes(activeTag.value!)) : posts.value
)
</script>

<template>
  <div>
    <h1 class="page-title">{{ t('文章', 'Posts') }}</h1>

    <div class="tag-bar">
      <button
        class="tag-chip"
        :class="{ active: activeTag === null }"
        @click="activeTag = null"
      >{{ t('全部', 'All') }} · {{ posts.length }}</button>
      <button
        v-for="cat in CATEGORIES"
        :key="cat"
        class="tag-chip"
        :class="{ active: activeTag === cat, dim: counts[cat] === 0 }"
        @click="activeTag = cat"
      >{{ cat }} · {{ counts[cat] }}</button>
    </div>

    <div v-if="filtered.length === 0" class="glass-card empty-state">
      <p>{{ t('这个分类还没有文章，先在后台写一篇吧。', 'No posts in this category yet.') }}</p>
    </div>

    <ul class="post-list">
      <li
        v-for="(post, i) in filtered"
        :key="post.slug"
        class="glass-card post-item"
        :style="{ animationDelay: 0.1 + i * 0.07 + 's' }"
      >
        <RouterLink :to="`/post/${post.slug}`" class="post-link">
          <span class="post-date">{{ formatDate(post.date) }}</span>
          <h2 class="post-title">{{ post.title }}</h2>
          <p class="post-excerpt">{{ post.excerpt }}</p>
          <span class="post-tags">
            <span v-for="tag in post.tags" :key="tag" class="tag">#{{ tag }}</span>
          </span>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>
