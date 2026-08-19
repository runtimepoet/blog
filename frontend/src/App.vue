<script setup lang="ts">
import BackgroundFX from './components/BackgroundFX.vue'
import StatusBar from './components/StatusBar.vue'
import { t } from './i18n'
</script>

<template>
  <div class="site">
    <BackgroundFX />

    <header class="site-header glass-bar">
      <div class="wrap header-inner">
        <RouterLink to="/" class="brand">runtimepoet<span>{{ t('@blog:~$', '@blog:~$') }}</span></RouterLink>
        <nav class="site-nav">
          <RouterLink to="/projects">{{ t('项目', 'Projects') }}</RouterLink>
          <RouterLink to="/posts">{{ t('文章', 'Posts') }}</RouterLink>
        </nav>
      </div>
    </header>

    <main class="wrap site-main">
      <RouterView />
    </main>

    <footer class="wrap">
      <StatusBar />
    </footer>
  </div>
</template>
