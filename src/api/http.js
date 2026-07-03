import axios from 'axios'
import { showError } from '../utils/message'

const http = axios.create({
  baseURL: '',
  timeout: 15000
})

class HandledApiError extends Error {
  constructor(message) {
    super(message)
    this.name = 'HandledApiError'
    this.handled = true
  }
}

http.interceptors.request.use(config => {
  const token = localStorage.getItem('hr_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export async function post(url, data = {}) {
  return requestPost(url, data)
}

export async function postForm(url, formData) {
  return requestPost(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

async function requestPost(url, data = {}, config = {}) {
  try {
    const response = await http.post(url, data, config)
    const body = response.data
    if (body && body.code !== 0) {
      if (body.code === 401001) {
        clearLogin()
      }
      const message = body.message || '请求失败'
      showError(message)
      throw new HandledApiError(message)
    }
    return body ? body.data : null
  } catch (err) {
    if (err.handled) {
      throw err
    }
    if (!err.response) {
      showError(err.message || '网络异常，请稍后再试')
      throw err
    }
    const message = err.response.data?.message || '网络异常，请稍后再试'
    if (err.response.status === 401 || err.response.data?.code === 401001) {
      clearLogin()
    }
    showError(message)
    throw new Error(message)
  }
}

function clearLogin() {
  localStorage.removeItem('hr_token')
  localStorage.removeItem('hr_user')
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}
