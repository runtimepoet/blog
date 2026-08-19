<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { lang } from '../i18n'

const LINES = {
  zh: [
    '"Talk is cheap. Show me the code." — Linus Torvalds',
    '"Given enough eyeballs, all bugs are shallow." — Eric S. Raymond',
    '"Premature optimization is the root of all evil." — Donald Knuth',
    '"First, solve the problem. Then, write the code." — John Johnson',
    '"Make it work, make it right, make it fast." — Kent Beck',
    '"Programs must be written for people to read." — Harold Abelson',
    '"Controlling complexity is the essence of computer programming." — Brian Kernighan',
    '"The only way to go fast is to go well." — Robert C. Martin',
    '"Security is a process, not a product." — Bruce Schneier',
    '"Amateurs hack systems, professionals hack people." — Bruce Schneier',
    '"The best way to predict the future is to invent it." — Alan Kay',
    '"Code is like humor. When you have to explain it, it\'s bad." — Cory House',
    '"Cache invalidation and naming things are the two hard things." — Phil Karlton',
    '在代码、安全与内核之间穿梭。',
    '持续学习，持续输出。',
  ],
  en: [
    '"Talk is cheap. Show me the code." — Linus Torvalds',
    '"Given enough eyeballs, all bugs are shallow." — Eric S. Raymond',
    '"Premature optimization is the root of all evil." — Donald Knuth',
    '"First, solve the problem. Then, write the code." — John Johnson',
    '"Make it work, make it right, make it fast." — Kent Beck',
    '"Programs must be written for people to read." — Harold Abelson',
    '"Controlling complexity is the essence of computer programming." — Brian Kernighan',
    '"The only way to go fast is to go well." — Robert C. Martin',
    '"Security is a process, not a product." — Bruce Schneier',
    '"Amateurs hack systems, professionals hack people." — Bruce Schneier',
    '"The best way to predict the future is to invent it." — Alan Kay',
    '"Code is like humor. When you have to explain it, it\'s bad." — Cory House',
    '"Cache invalidation and naming things are the two hard things." — Phil Karlton',
    '"Debugging is twice as hard as writing the code." — Brian Kernighan',
    'Coding, security & kernels.',
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
