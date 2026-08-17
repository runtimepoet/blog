<script setup lang="ts">
import { t } from '../i18n'
</script>

<template>
  <div class="about glass-card post-shell">
    <h1>{{ t('关于', 'About') }}</h1>
    <p>
      {{ t(
        '我是 runtimepoet，在台湾的开发者，开发与学习已近十年。主要做 Web 开发（TypeScript、Vue / React、ASP.NET Core、Go），同时深入研究安全——Web 安全、逆向工程，以及系统如何被攻破。',
        "I'm runtimepoet, a developer based in Taiwan with nearly a decade of building and learning behind me. I work mostly on web development (TypeScript, Vue / React, ASP.NET Core, Go) and I'm deep into security — web security, reverse engineering, and understanding how systems break."
      ) }}
    </p>
    <p>
      {{ t(
        '最近在向更底层探索：Windows 内核与虚拟机监控程序。这个博客就是笔记落地的地方。',
        "Lately I've been going lower level: Windows kernel internals and hypervisors. This blog is where the notes land."
      ) }}
    </p>
    <p>
      <a href="https://github.com/runtimepoet" target="_blank" rel="noopener">GitHub →</a>
    </p>
  </div>
</template>
