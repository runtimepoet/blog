import { ref } from 'vue'

const stored = localStorage.getItem('theme')
const initial = stored === 'light' ? 'light' : 'dark'

export const theme = ref<'dark' | 'light'>(initial)

export function initTheme(): void {
  document.documentElement.dataset.theme = theme.value
}

export function toggleTheme(): void {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  document.documentElement.dataset.theme = theme.value
  localStorage.setItem('theme', theme.value)
}
