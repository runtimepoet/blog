<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { lang } from '../i18n'

const LINES = {
  zh: [
    '"Talk is cheap. Show me the code." — Linus Torvalds',
    '在代码、安全与内核之间穿梭。',
    '"Given enough eyeballs, all bugs are shallow." — Eric S. Raymond',
    '持续学习，持续输出。',
    '"The best way to predict the future is to invent it." — Alan Kay',
  ],
  en: [
    '"Talk is cheap. Show me the code." — Linus Torvalds',
    '"Given enough eyeballs, all bugs are shallow." — Eric S. Raymond',
    'Coding, security & kernels.',
    '"The best way to predict the future is to invent it." — Alan Kay',
    'Keep learning, keep shipping.',
  ],
}

const lines = computed(() => LINES[lang.value])
const index = ref(0)
let timer: number | undefined

onMounted(() => {
  timer = window.setInterval(() => {
    index.value = (index.value + 1) % lines.value.length
  }, 4200)
})

onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div class="ticker">
    <Transition name="ticker-fade" mode="out-in">
      <span :key="`${lang}-${index}`">{{ lines[index] }}</span>
    </Transition>
  </div>
</template>
