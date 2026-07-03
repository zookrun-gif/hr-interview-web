import { reactive } from 'vue'

let seed = 0

export const messageState = reactive({
  list: []
})

export function showMessage(options) {
  const item = {
    id: ++seed,
    type: options.type || 'error',
    text: options.text || '请求失败',
    duration: options.duration || 3000
  }
  messageState.list.push(item)
  window.setTimeout(() => closeMessage(item.id), item.duration)
}

export function showError(text) {
  showMessage({ type: 'error', text })
}

export function showSuccess(text) {
  showMessage({ type: 'success', text })
}

export function closeMessage(id) {
  const index = messageState.list.findIndex(item => item.id === id)
  if (index >= 0) {
    messageState.list.splice(index, 1)
  }
}
