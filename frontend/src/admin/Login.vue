<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from './api'

const router = useRouter()
const pwd = ref('')
const error = ref('')
const busy = ref(false)

const submit = async () => {
  if (busy.value) return
  busy.value = true
  error.value = ''
  const ok = await login(pwd.value).catch(() => false)
  busy.value = false
  if (ok) router.push('/admin/posts')
  else error.value = '密码错误 / Wrong password'
}
</script>

<template>
  <div class="admin-login">
    <form class="glass-card login-card" @submit.prevent="submit">
      <h1>📝 Blog Admin</h1>
      <input v-model="pwd" type="password" placeholder="管理密码" autocomplete="current-password" autofocus />
      <div class="login-err">{{ error }}</div>
      <button class="btn-glass primary login-btn" type="submit" :disabled="busy">
        {{ busy ? '…' : '登录' }}
      </button>
    </form>
  </div>
</template>
