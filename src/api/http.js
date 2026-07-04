import axios from 'axios'
import { showError } from '../utils/message'

const http = axios.create({
  baseURL: '',
  timeout: 15000
})

class HandledApiError extends Error {
  constructor(message, code) {
    super(message)
    this.name = 'HandledApiError'
    this.handled = true
    this.code = code
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

export async function postForm(url, formData, config = {}) {
  return requestPost(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    ...config
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
      if (body.code !== 429001) {
        showError(message)
      }
      throw new HandledApiError(message, body.code)
    }
    return body ? body.data : null
  } catch (err) {
    if (err.handled) {
      throw err
    }
    if (!err.response) {
      showError(err.code === 'ECONNABORTED' ? '请求处理时间较长，请稍后重试' : (err.message || '网络异常，请稍后再试'))
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
