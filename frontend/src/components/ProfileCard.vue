<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../i18n'
import { posts } from '../posts'
import avatarUrl from '../assets/avatar.jpg'

const EMAIL = 'runtimepoet910601@gmail.com'

const postCount = computed(() => posts.value.length)
const tagCount = computed(() => new Set(posts.value.flatMap(p => p.tags)).size)
const projectCount = 7
</script>

<template>
  <section class="profile-card glass-card">
    <div class="avatar-ring">
      <img
        class="avatar"
        :src="avatarUrl"
        alt="runtimepoet avatar"
        width="96"
        height="96"
      />
    </div>

    <div class="profile-main">
      <h1 class="profile-name">runtimepoet</h1>
      <p class="profile-bio">
        {{ t(
          '在台湾的开发者，开发与学习已近十年。有时写 Web（Vue / React / ASP.NET Core），有时钻研安全与 Windows 内核——兴趣驱动，持续学习，持续输出。',
          'Developer based in Taiwan — nearly a decade of building & learning. Sometimes building web apps (Vue / React / ASP.NET Core), sometimes digging into security and Windows kernels — curiosity-driven, always writing it down.'
        ) }}
      </p>

      <div class="profile-stats">
        <div class="stat"><b>{{ postCount }}</b><span>{{ t('文章', 'Posts') }}</span></div>
        <div class="stat-divider" />
        <div class="stat"><b>{{ tagCount }}</b><span>{{ t('标签', 'Tags') }}</span></div>
        <div class="stat-divider" />
        <div class="stat"><b>{{ projectCount }}</b><span>{{ t('项目', 'Projects') }}</span></div>

        <div class="profile-socials">
          <a
            class="social-btn"
            href="https://github.com/runtimepoet"
            target="_blank"
            rel="noopener"
            title="GitHub"
            aria-label="GitHub"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path
                d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
              />
            </svg>
          </a>
          <a class="social-btn" :href="`mailto:${EMAIL}`" title="Email" aria-label="Email">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              width="18"
              height="18"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-10 6L2 7" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  </section>
</template>
