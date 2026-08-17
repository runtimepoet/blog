import { ref } from 'vue'

export const toastText = ref('')
export const toastOk = ref(true)
const show = ref(false)
let timer: number | undefined

export { show as toastShow }

export function toast(text: string, ok = true): void {
  toastText.value = text
  toastOk.value = ok
  show.value = true
  clearTimeout(timer)
  timer = window.setTimeout(() => (show.value = false), 2200)
}
