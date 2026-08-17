import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// BUILD_BASE=/ for the self-hosted server build; '/blog/' for the Pages mirror.
export default defineConfig({
  plugins: [vue()],
  base: process.env.BUILD_BASE ?? '/blog/',
  server: {
    proxy: {
      '/blog/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/blog\/api/, '/api')
      }
    }
  }
})
