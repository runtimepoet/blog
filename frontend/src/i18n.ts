import { ref } from 'vue'

/** UI language follows the browser: zh-* -> Chinese, everything else -> English. */
const browser = (navigator.language || 'en').toLowerCase()
export const lang = ref<'zh' | 'en'>(browser.startsWith('zh') ? 'zh' : 'en')

export const t = (zh: string, en: string): string => (lang.value === 'zh' ? zh : en)
