import { createRouter, createWebHistory } from 'vue-router'
import DashboardPage from '../pages/DashboardPage.vue'
import InterviewPage from '../pages/InterviewPage.vue'
import LoginPage from '../pages/LoginPage.vue'
import WeComCallbackPage from '../pages/WeComCallbackPage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardPage,
      meta: { requiresAuth: true, title: '奢享家HR管理系统' }
    },
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
      meta: { title: '奢享家HR登录' }
    },
    {
      path: '/login/wecom-callback',
      name: 'wecomCallback',
      component: WeComCallbackPage,
      meta: { title: '企业微信登录' }
    },
    {
      path: '/interview/:token',
      name: 'interview',
      component: InterviewPage,
      meta: { title: '奢享家AI面试间' }
    }
  ]
})

router.beforeEach((to, from, next) => {
  document.title = to.meta.title || '奢享家HR管理系统'
  if (to.name === 'interview') {
    next()
    return
  }
  const token = localStorage.getItem('hr_token')
  if (to.meta.requiresAuth && !token) {
    next('/login')
    return
  }
  if (to.name === 'login' && token) {
    next('/')
    return
  }
  next()
})

export default router
