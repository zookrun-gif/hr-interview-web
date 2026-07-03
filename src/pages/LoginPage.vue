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
    </section>
  </main>
</template>

<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '../api/hr'
import { showSuccess } from '../utils/message'
import brandLogo from '../assets/shexiangjia-logo.png'

const router = useRouter()
const form = reactive({
  email: '',
  password: ''
})

async function login() {
  try {
    const result = await authApi.login(form)
    localStorage.setItem('hr_token', result.token)
    localStorage.setItem('hr_user', JSON.stringify(result.user))
    showSuccess('登录成功')
    await router.push('/')
  } catch (err) {
  }
}
</script>
