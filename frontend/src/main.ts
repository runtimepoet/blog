import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { initTheme } from './theme'
import { loadPosts } from './posts'
import './style.css'

initTheme()
const app = createApp(App).use(router)
loadPosts().finally(() => app.mount('#app'))
