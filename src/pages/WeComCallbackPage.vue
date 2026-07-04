<template>
  <main class="login-page">
    <section class="login-panel callback-panel">
      <div class="login-header">
        <div class="login-brand-title">
          <img class="brand-logo" :src="brandLogo" alt="奢享家" />
          <span>企业微信登录</span>
        </div>
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
      </div>
      <button v-if="failed" class="primary" type="button" @click="backToLogin">返回登录</button>
    </section>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authApi } from '../api/hr'
import { showError, showSuccess } from '../utils/message'
import brandLogo from '../assets/shexiangjia-logo.png'

const route = useRoute()
const router = useRouter()
const title = ref('正在登录')
const description = ref('正在校验企业微信身份，请稍候。')
const failed = ref(false)

onMounted(async () => {
  const code = route.query.code
  const state = route.query.state
  if (!code || !state) {
    markFailed('企业微信回调参数不完整，请重新扫码', true)
    return
  }

  try {
    const result = await authApi.wecomLogin({
      code: Array.isArray(code) ? code[0] : code,
      state: Array.isArray(state) ? state[0] : state
    })
    localStorage.setItem('hr_token', result.token)
    localStorage.setItem('hr_user', JSON.stringify(result.user))
    showSuccess('企业微信登录成功')
    await router.replace('/')
  } catch (err) {
    markFailed(err.message || '企业微信登录失败，请重新扫码')
  }
})

function markFailed(message, notify = false) {
  title.value = '登录失败'
  description.value = message
  failed.value = true
  if (notify) {
    showError(message)
  }
}

function backToLogin() {
  router.replace('/login')
}
</script>
