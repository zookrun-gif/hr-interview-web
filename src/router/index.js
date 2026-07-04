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
      meta: { requiresAuth: true }
    },
    {
      path: '/login',
      name: 'login',
      component: LoginPage
    },
    {
      path: '/login/wecom-callback',
      name: 'wecomCallback',
      component: WeComCallbackPage
    },
    {
      path: '/interview/:token',
      name: 'interview',
      component: InterviewPage
    }
  ]
})

router.beforeEach((to, from, next) => {
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
