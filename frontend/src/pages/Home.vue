<script setup lang="ts">
import { computed, ref } from 'vue'
import ProfileCard from '../components/ProfileCard.vue'
import TickerBar from '../components/TickerBar.vue'
import { t } from '../i18n'
import { formatDate, posts } from '../posts'
import { theme, toggleTheme } from '../theme'

const query = ref('')

const latest = computed(() => {
  const q = query.value.trim().toLowerCase()
  const list = q
    ? posts.value.filter(p =>
        [p.title, p.excerpt, p.tags.join(' '), p.body]
          .join(' ')
          .toLowerCase()
          .includes(q)
      )
    : posts.value
  return list.slice(0, 5)
})
</script>

<template>
  <div class="search-wrap">
    <label class="search-box">
      <span class="mag">🔍</span>
      <input
        v-model="query"
        type="search"
        :placeholder="t('搜索标题、描述或标签…', 'Search title, excerpt or tags…')"
      />
    </label>
  </div>

  <ProfileCard />

  <TickerBar />

  <section>
    <div class="section-head">
      <h2>{{ t('最新文章', 'Latest writing') }}</h2>
      <RouterLink to="/posts" class="more-link">{{ t('全部文章 →', 'All posts →') }}</RouterLink>
    </div>

    <ul class="row-list">
      <li
        v-for="(post, i) in latest"
        :key="post.slug"
        class="glass-card row-item"
        :style="{ animationDelay: 0.1 + i * 0.08 + 's' }"
      >
        <RouterLink :to="`/post/${post.slug}`" class="row-link">
          <span class="row-date">{{ formatDate(post.date) }}</span>
          <span class="row-title">{{ post.title }}</span>
          <span class="row-tags">
            <span v-for="tag in post.tags" :key="tag" class="tag">#{{ tag }}</span>
          </span>
        </RouterLink>
      </li>

      <li class="glass-card row-item" :style="{ animationDelay: 0.1 + latest.length * 0.08 + 's' }">
        <button class="row-link row-button" @click="toggleTheme">
          <span class="theme-icon">{{ theme === 'dark' ? '🌞' : '✨' }}</span>
          <span class="row-title">{{
            theme === 'dark' ? t('日间模式', 'Light mode') : t('夜间模式', 'Dark mode')
          }}</span>
          <span class="row-tags">{{
            theme === 'dark' ? t('切换到清爽浅色', 'Switch to light') : t('流萤飞舞的深空', 'Fireflies in deep space')
          }}</span>
        </button>
      </li>
    </ul>
  </section>
</template>
