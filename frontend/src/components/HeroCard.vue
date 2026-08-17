<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const roles = ['Web Developer', 'Security Enthusiast', 'Kernel Learner', 'Vibe Coder']
const typed = ref('')
let timer: number | undefined

onMounted(() => {
  let role = 0
  let char = 0
  let deleting = false
  timer = window.setInterval(() => {
    const word = roles[role]
    char += deleting ? -1 : 1
    typed.value = word.slice(0, Math.max(0, char))
    if (!deleting && char === word.length) {
      deleting = true
      char = word.length + 14 // hold the full word for a beat
    } else if (deleting && char <= 0) {
      deleting = false
      char = 0
      role = (role + 1) % roles.length
    }
  }, 70)
})

onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <section class="hero glass-card">
    <div class="avatar-ring">
      <img
        class="avatar"
        src="https://avatars.githubusercontent.com/u/5982384?v=4"
        alt="runtimepoet avatar"
        width="104"
        height="104"
      />
    </div>

    <h1 class="hero-name">runtimepoet</h1>
    <p class="hero-roles">{{ typed }}<span class="caret">|</span></p>

    <p class="hero-bio">
      Developer based in Taiwan — nearly a decade of building &amp; learning.
      Web by day, security research and Windows kernels by night.
    </p>

    <div class="hero-chips">
      <span class="chip">📍 Taiwan</span>
      <span class="chip">💻 Web · Security · Kernel</span>
      <span class="chip">🤖 Vibe Coding</span>
    </div>

    <div class="hero-actions">
      <a class="btn-glass primary" href="https://github.com/runtimepoet" target="_blank" rel="noopener">
        GitHub
      </a>
      <RouterLink class="btn-glass" to="/posts">All posts</RouterLink>
      <a
        class="btn-glass"
        href="https://github.com/runtimepoet/WeatherMaster"
        target="_blank"
        rel="noopener"
      >
        WeatherMaster
      </a>
    </div>
  </section>
</template>
