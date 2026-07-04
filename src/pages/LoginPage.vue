<template>
  <main class="login-page">
    <section class="login-panel">
      <div class="login-header">
        <div class="login-brand-title">
          <img class="brand-logo" :src="brandLogo" alt="奢享家" />
          <span>奢享家 HR</span>
        </div>
        <h1>奢享家HR管理系统</h1>
      </div>

      <form class="form-grid" @submit.prevent="login">
        <label>
          邮箱
          <input v-model="form.email" type="email" placeholder="admin@example.com" />
        </label>
        <label>
          密码
          <input v-model="form.password" type="password" placeholder="请输入密码" />
        </label>
        <button class="primary" type="submit">登录</button>
      </form>

      <div class="login-divider"><span>或</span></div>
      <button class="wecom-login" type="button" :disabled="wecomLoading" @click="goWeComLogin">
        <span class="wecom-icon">企</span>
        {{ wecomLoading ? '正在打开企业微信' : '企业微信扫码登录' }}
      </button>
    </section>
  </main>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '../api/hr'
import { showSuccess } from '../utils/message'
import brandLogo from '../assets/shexiangjia-logo.png'

const router = useRouter()
const form = reactive({
  email: '',
  password: ''
})
const wecomLoading = ref(false)

async function login() {
  try {
    const result = await authApi.login(form)
    saveLoginResult(result)
    showSuccess('登录成功')
    await router.push('/')
  } catch (err) {
  }
}

async function goWeComLogin() {
  try {
    wecomLoading.value = true
    const config = await authApi.wecomConfig({})
    if (!config?.enabled || !config.loginUrl) {
      return
    }
    window.location.href = config.loginUrl
  } finally {
    wecomLoading.value = false
  }
}

function saveLoginResult(result) {
  localStorage.setItem('hr_token', result.token)
  localStorage.setItem('hr_user', JSON.stringify(result.user))
}
</script>
