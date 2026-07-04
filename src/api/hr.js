import { post, postForm } from './http'

export const authApi = {
  login: data => post('/api/auth/login', data),
  wecomConfig: data => post('/api/auth/wecom/config', data),
  wecomLogin: data => post('/api/auth/wecom/login', data),
  me: data => post('/api/auth/me', data),
  logout: data => post('/api/auth/logout', data),
  changePassword: data => post('/api/auth/change-password', data)
}

export const jobApi = {
  list: data => post('/api/jobs/list', data),
  create: data => post('/api/jobs/create', data),
  update: data => post('/api/jobs/update', data),
  delete: data => post('/api/jobs/delete', data),
  detail: data => post('/api/jobs/detail', data)
}

export const candidateApi = {
  list: data => post('/api/candidates/list', data),
  create: data => post('/api/candidates/create', data),
  update: data => post('/api/candidates/update', data),
  delete: data => post('/api/candidates/delete', data),
  detail: data => post('/api/candidates/detail', data),
  parseResumePdf: file => {
    const formData = new FormData()
    formData.append('file', file)
    return postForm('/api/candidates/resume/parse-pdf', formData, { timeout: 120000 })
  }
}

export const interviewApi = {
  list: data => post('/api/interviews/list', data),
  create: data => post('/api/interviews/create', data),
  resetAccessCode: data => post('/api/interviews/access-code/reset', data),
  messages: data => post('/api/interviews/messages/list', data),
  report: data => post('/api/interviews/reports/detail', data),
  reports: data => post('/api/interviews/reports/list', data)
}

export const publicInterviewApi = {
  detail: data => post('/api/public/interviews/detail', data),
  enter: data => post('/api/public/interviews/enter', data),
  finish: data => post('/api/public/interviews/finish', data),
  connectRealtime: data => post('/api/public/interviews/realtime/connect', data)
}

export const rbacApi = {
  roles: data => post('/api/rbac/roles/list', data),
  createRole: data => post('/api/rbac/roles/create', data),
  updateRole: data => post('/api/rbac/roles/update', data),
  deleteRole: data => post('/api/rbac/roles/delete', data),
  permissions: data => post('/api/rbac/permissions/list', data),
  createPermission: data => post('/api/rbac/permissions/create', data),
  updatePermission: data => post('/api/rbac/permissions/update', data),
  deletePermission: data => post('/api/rbac/permissions/delete', data),
  rolePermissions: data => post('/api/rbac/roles/permissions/detail', data),
  saveRolePermissions: data => post('/api/rbac/roles/permissions/save', data),
  users: data => post('/api/rbac/users/list', data),
  createUser: data => post('/api/rbac/users/create', data),
  resetUserPassword: data => post('/api/rbac/users/password/reset', data),
  saveUserRoles: data => post('/api/rbac/users/roles/save', data)
}
