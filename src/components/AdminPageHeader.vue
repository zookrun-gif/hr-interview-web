<template>
  <header class="admin-topbar">
    <div class="topbar-title page-heading">
      <span class="page-icon">
        <component :is="icon" :size="22" stroke-width="2.2" />
      </span>
      <div>
        <b>{{ title }}</b>
        <small>{{ description }}</small>
      </div>
    </div>
    <div ref="profileRef" class="topbar-actions user-profile-wrap">
      <button class="user-profile-card" type="button" @click="menuOpen = !menuOpen">
        <span class="avatar">{{ userInitial }}</span>
        <span class="user-meta">
          <b>{{ userName }}</b>
          <small>{{ userEmail }}</small>
        </span>
        <ChevronDown :class="['user-menu-arrow', { open: menuOpen }]" :size="16" stroke-width="2.2" />
      </button>
      <div v-if="menuOpen" class="user-profile-menu">
        <button class="user-menu-item danger-text" type="button" @click="emitLogout">
          <LogOut :size="16" stroke-width="2.2" />
          <span>退出登录</span>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { BriefcaseBusiness, ChevronDown, LogOut } from '@lucide/vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  icon: {
    type: [Object, Function],
    default: BriefcaseBusiness
  },
  user: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['logout'])
const menuOpen = ref(false)
const profileRef = ref(null)

const userName = computed(() => props.user?.name || '管理员')
const userEmail = computed(() => props.user?.email || 'HR 工作台')
const userInitial = computed(() => userName.value.slice(0, 1))

function emitLogout() {
  menuOpen.value = false
  emit('logout')
}

function handleDocumentClick(event) {
  if (!menuOpen.value) {
    return
  }
  if (profileRef.value && !profileRef.value.contains(event.target)) {
    menuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>
