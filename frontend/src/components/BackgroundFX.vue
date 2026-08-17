<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

// Local wallpapers bundled in public/bg — no third-party image APIs.
const COUNT = 5
const base = import.meta.env.BASE_URL
const current = ref(0)
let timer: number | undefined

onMounted(() => {
  timer = window.setInterval(() => {
    current.value = (current.value + 1) % COUNT
  }, 8000)
})

onBeforeUnmount(() => clearInterval(timer))

const particles = Array.from({ length: 16 }, () => ({
  left: Math.random() * 100,
  top: Math.random() * 100,
  size: 2.5 + Math.random() * 3.5,
  duration: 14 + Math.random() * 18,
  delay: -Math.random() * 20,
  opacity: 0.2 + Math.random() * 0.4,
}))
</script>

<template>
  <div class="bg-fx" aria-hidden="true">
    <img
      v-for="i in COUNT"
      :key="i"
      class="bg-img slide"
      :class="{ active: i - 1 === current }"
      :src="`${base}bg/${i}.jpg`"
      alt=""
    />
    <div class="bg-dim" />
    <span
      v-for="(p, i) in particles"
      :key="i"
      class="particle"
      :style="{
        left: p.left + '%',
        top: p.top + '%',
        width: p.size + 'px',
        height: p.size + 'px',
        opacity: p.opacity,
        animationDuration: p.duration + 's',
        animationDelay: p.delay + 's',
      }"
    />
  </div>
</template>
