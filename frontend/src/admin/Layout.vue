<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { checkToken, clearToken } from './api'
import { toastOk, toastShow, toastText } from './toast'
import './admin.css'

const router = useRouter()
const ready = ref(false)

onMounted(async () => {
  if (await checkToken()) ready.value = true
  else router.replace('/admin/login')
})

const logout = () => {
  clearToken()
  router.replace('/admin/login')
}
</script>

<template>
  <div v-if="ready" class="admin-shell">
    <nav class="admin-side">
      <RouterLink to="/" class="admin-logo">📝 Blog 后台</RouterLink>
      <RouterLink class="admin-tab" to="/admin/posts">📄 文章管理</RouterLink>
      <RouterLink class="admin-tab" to="/admin/projects">🧩 项目信息</RouterLink>
      <RouterLink class="admin-tab" to="/admin/images">🖼️ 图片</RouterLink>
      <div class="admin-side-foot">
        <button class="admin-tab" @click="logout">⏻ 退出登录</button>
      </div>
    </nav>
    <main class="admin-main">
      <RouterView />
    </main>
    <div class="admin-toast" :class="{ show: toastShow, ok: toastOk, bad: !toastOk }">
      {{ toastText }}
    </div>
  </div>
</template>
