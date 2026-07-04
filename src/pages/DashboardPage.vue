<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="sidebar-brand">
        <img class="brand-logo" :src="brandLogo" alt="奢享家" />
        <div>
          <div class="brand">奢享家HR管理系统</div>
        </div>
      </div>
      <AppMenu :items="menuItems" @select="handleMenuSelect" />
    </aside>

    <main class="main admin-main">
      <header class="admin-topbar">
        <div class="topbar-title">
          <b>{{ activeTabTitle }}</b>
          <small>{{ activeTabDesc }}</small>
        </div>
        <div class="topbar-actions">
          <span class="avatar">{{ userInitial }}</span>
          <span class="user-name">{{ currentUser?.name || '管理员' }}</span>
          <button @click="openPasswordModal">修改密码</button>
          <button class="danger" @click="logout">退出登录</button>
        </div>
      </header>

      <section v-show="activeTab === 'jobs'" class="admin-page">
        <section class="query-panel">
          <form class="query-grid" @submit.prevent="searchJobs">
            <label>
              岗位名称：
              <input v-model="jobQuery.keyword" placeholder="请输入岗位名称" />
            </label>
            <label>
              岗位状态：
              <select v-model="jobQuery.status">
                <option value="">全部</option>
                <option value="ENABLED">启用</option>
                <option value="DISABLED">停用</option>
              </select>
            </label>
            <div class="query-actions">
              <button class="primary" type="submit" :disabled="loading">搜索</button>
              <button type="button" :disabled="loading" @click="resetJobQuery">重置</button>
            </div>
          </form>
        </section>

        <section class="data-panel">
          <div class="panel-toolbar">
            <h2>岗位列表</h2>
            <button v-if="hasPermission('job:create')" class="primary" @click="openCreateModal('jobs')">新增岗位</button>
          </div>
          <div class="data-table job-table">
            <div class="table-row table-head">
              <span>创建时间</span>
              <span>岗位名称</span>
              <span>岗位 JD</span>
              <span>能力要求</span>
              <span>状态</span>
              <span>操作</span>
            </div>
            <div v-for="job in jobs" :key="job.id" class="table-row">
              <span class="time-cell">
                <b>{{ formatDate(job.createdAt) }}</b>
                <small>{{ formatClock(job.createdAt) }}</small>
              </span>
              <span>{{ job.title }}</span>
              <span>
                <button class="text-link" :disabled="loading" @click="previewJobContent(job.id, 'jd')">
                  {{ job.jdSummary || '-' }}
                </button>
              </span>
              <span>
                <button class="text-link" :disabled="loading" @click="previewJobContent(job.id, 'requirements')">
                  {{ job.requirementsSummary || '-' }}
                </button>
              </span>
              <span class="status-cell">
                <button
                  type="button"
                  :class="['switch-control', { active: job.status === 'ENABLED' }]"
                  :disabled="loading"
                  @click="toggleJobStatus(job)"
                >
                  <i></i>
                  <b>{{ statusText(job.status) }}</b>
                </button>
              </span>
              <span class="actions">
                <button v-if="hasPermission('job:update')" :disabled="loading" @click="editJob(job.id)">编辑</button>
                <button v-if="hasPermission('job:delete')" class="danger" :disabled="loading" @click="deleteJob(job.id)">删除</button>
              </span>
            </div>
            <div v-if="jobs.length === 0" class="empty-row">暂无岗位数据</div>
          </div>
          <div class="pagination-bar">
            <div class="pagination-info">
              当前第 {{ jobPagination.pageNo }} 页，每页
              <select v-model.number="jobPagination.pageSize" :disabled="loading" @change="changePageSize(jobPagination, loadJobs)">
                <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
              </select>
              条，共 {{ jobPagination.total }} 条，显示 {{ paginationRange(jobPagination) }}
            </div>
            <div class="pagination-actions">
              <button :disabled="loading || jobPagination.pageNo <= 1" @click="changePage(jobPagination, loadJobs, jobPagination.pageNo - 1)">上一页</button>
              <span>{{ jobPagination.pageNo }} / {{ totalPages(jobPagination) }}</span>
              <button :disabled="loading || jobPagination.pageNo >= totalPages(jobPagination)" @click="changePage(jobPagination, loadJobs, jobPagination.pageNo + 1)">下一页</button>
            </div>
          </div>
        </section>
      </section>

      <section v-show="activeTab === 'candidates'" class="admin-page">
        <section class="query-panel">
          <form class="query-grid" @submit.prevent="searchCandidates">
            <label>
              关键字：
              <input v-model="candidateQuery.keyword" placeholder="姓名、手机号、邮箱" />
            </label>
            <label>
              绑定岗位：
              <select v-model="candidateQuery.jobId">
                <option value="">全部岗位</option>
                <option v-for="job in jobOptions" :key="job.id" :value="job.id">{{ job.title }}</option>
              </select>
            </label>
            <div class="query-actions">
              <button class="primary" type="submit" :disabled="loading">搜索</button>
              <button type="button" :disabled="loading" @click="resetCandidateQuery">重置</button>
            </div>
          </form>
        </section>

        <section class="data-panel">
          <div class="panel-toolbar">
            <h2>候选人列表</h2>
            <button v-if="hasPermission('candidate:create')" class="primary" @click="openCreateModal('candidates')">新增候选人</button>
          </div>
          <div class="data-table candidate-table">
            <div class="table-row table-head">
              <span>创建时间</span>
              <span>绑定岗位</span>
              <span>姓名</span>
              <span>性别</span>
              <span>年龄</span>
              <span>手机号</span>
              <span>邮箱</span>
              <span>操作</span>
            </div>
            <div v-for="candidate in candidates" :key="candidate.id" class="table-row">
              <span class="time-cell">
                <b>{{ formatDate(candidate.createdAt) }}</b>
                <small>{{ formatClock(candidate.createdAt) }}</small>
              </span>
              <span>{{ candidate.jobTitle || '-' }}</span>
              <span>{{ candidate.name }}</span>
              <span>{{ genderText(candidate.gender) }}</span>
              <span>{{ candidate.age ?? '-' }}</span>
              <span>{{ candidate.phone || '-' }}</span>
              <span>{{ candidate.email || '-' }}</span>
              <span class="actions">
                <button v-if="hasPermission('candidate:update')" :disabled="loading" @click="editCandidate(candidate.id)">编辑</button>
                <button :disabled="loading" @click="previewResume(candidate.id)">预览</button>
                <button v-if="hasPermission('candidate:delete')" class="danger" :disabled="loading" @click="deleteCandidate(candidate.id)">删除</button>
              </span>
            </div>
            <div v-if="candidates.length === 0" class="empty-row">暂无候选人数据</div>
          </div>
          <div class="pagination-bar">
            <div class="pagination-info">
              当前第 {{ candidatePagination.pageNo }} 页，每页
              <select v-model.number="candidatePagination.pageSize" :disabled="loading" @change="changePageSize(candidatePagination, loadCandidates)">
                <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
              </select>
              条，共 {{ candidatePagination.total }} 条，显示 {{ paginationRange(candidatePagination) }}
            </div>
            <div class="pagination-actions">
              <button :disabled="loading || candidatePagination.pageNo <= 1" @click="changePage(candidatePagination, loadCandidates, candidatePagination.pageNo - 1)">上一页</button>
              <span>{{ candidatePagination.pageNo }} / {{ totalPages(candidatePagination) }}</span>
              <button :disabled="loading || candidatePagination.pageNo >= totalPages(candidatePagination)" @click="changePage(candidatePagination, loadCandidates, candidatePagination.pageNo + 1)">下一页</button>
            </div>
          </div>
        </section>
      </section>

      <section v-show="activeTab === 'interviews'" class="admin-page">
        <section class="query-panel">
          <form class="query-grid" @submit.prevent="searchInterviews">
            <label>
              岗位：
              <select v-model="interviewQuery.jobId">
                <option value="">全部岗位</option>
                <option v-for="job in jobOptions" :key="job.id" :value="job.id">{{ job.title }}</option>
              </select>
            </label>
            <label>
              候选人：
              <select v-model="interviewQuery.candidateId">
                <option value="">全部候选人</option>
                <option v-for="candidate in candidateOptions" :key="candidate.id" :value="candidate.id">{{ candidate.name }}</option>
              </select>
            </label>
            <label>
              面试状态：
              <select v-model="interviewQuery.status">
                <option value="">全部</option>
                <option value="INVITED">已邀请</option>
                <option value="WAITING">等待中</option>
                <option value="IN_PROGRESS">面试中</option>
                <option value="COMPLETED">已完成</option>
              </select>
            </label>
            <div class="query-actions">
              <button class="primary" type="submit" :disabled="loading">搜索</button>
              <button type="button" :disabled="loading" @click="resetInterviewQuery">重置</button>
            </div>
          </form>
        </section>

        <section class="data-panel">
          <div class="panel-toolbar">
            <h2>面试列表</h2>
            <button v-if="hasPermission('interview:create')" class="primary" @click="openCreateModal('interviews')">新增面试</button>
          </div>
          <div class="data-table interview-list-table">
            <div class="table-row table-head">
              <span>创建时间</span>
              <span>面试 ID</span>
              <span>岗位</span>
              <span>候选人</span>
              <span>状态</span>
              <span>邀请</span>
              <span>操作</span>
            </div>
            <div v-for="interview in interviews" :key="interview.id" class="table-row">
              <span class="time-cell">
                <b>{{ formatDate(interview.createdAt) }}</b>
                <small>{{ formatClock(interview.createdAt) }}</small>
              </span>
              <span>#{{ interview.id }}</span>
              <span>{{ interview.jobTitle || '-' }}</span>
              <span>{{ interview.candidateName || '-' }}</span>
              <span><b class="status-tag">{{ interviewStatusText(interview.status) }}</b></span>
              <span>
                <button v-if="interview.status === 'INVITED'" :disabled="loading" @click="copyInterviewInvite(interview)">复制邀请</button>
                <b v-else class="muted-text">-</b>
              </span>
              <span class="actions">
                <button :disabled="loading || interview.status !== 'COMPLETED'" @click="openReportModal(interview.id)">报告</button>
                <button :disabled="loading" @click="openMessagesModal(interview.id)">对话</button>
              </span>
            </div>
            <div v-if="interviews.length === 0" class="empty-row">暂无面试数据</div>
          </div>
          <div class="pagination-bar">
            <div class="pagination-info">
              当前第 {{ interviewPagination.pageNo }} 页，每页
              <select v-model.number="interviewPagination.pageSize" :disabled="loading" @change="changePageSize(interviewPagination, loadInterviews)">
                <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
              </select>
              条，共 {{ interviewPagination.total }} 条，显示 {{ paginationRange(interviewPagination) }}
            </div>
            <div class="pagination-actions">
              <button :disabled="loading || interviewPagination.pageNo <= 1" @click="changePage(interviewPagination, loadInterviews, interviewPagination.pageNo - 1)">上一页</button>
              <span>{{ interviewPagination.pageNo }} / {{ totalPages(interviewPagination) }}</span>
              <button :disabled="loading || interviewPagination.pageNo >= totalPages(interviewPagination)" @click="changePage(interviewPagination, loadInterviews, interviewPagination.pageNo + 1)">下一页</button>
            </div>
          </div>
        </section>
      </section>

      <section v-show="activeTab === 'rbacMenus'" class="admin-page">
        <section class="data-panel">
          <div class="panel-toolbar">
            <h2>菜单与按钮权限</h2>
            <button v-if="hasPermission('rbac:permission:create')" class="primary" @click="openPermissionModal()">新增权限</button>
          </div>
          <div class="data-table permission-table">
            <div class="table-row table-head">
              <span>名称</span>
              <span>类型</span>
              <span>权限编码</span>
              <span>前端标识</span>
              <span>状态</span>
              <span>操作</span>
            </div>
            <div v-for="permission in permissionMenuRows" :key="permission.id" class="table-row" :class="{ 'parent-row': permission.hasChildren }">
              <span class="tree-cell" :style="{ paddingLeft: `${12 + permission.level * 22}px` }">
                <button
                  v-if="permission.hasChildren"
                  type="button"
                  class="tree-toggle"
                  :aria-label="isPermissionExpanded(permission.id) ? '收起子权限' : '展开子权限'"
                  @click="togglePermissionExpand(permission.id)"
                >
                  {{ isPermissionExpanded(permission.id) ? '-' : '+' }}
                </button>
                <i v-else class="tree-spacer"></i>
                <b>{{ permission.name }}</b>
              </span>
              <span>{{ permissionTypeText(permission.type) }}</span>
              <span>{{ permission.code }}</span>
              <span>{{ permission.permissionKey || '-' }}</span>
              <span><b class="status-tag">{{ statusText(permission.status) }}</b></span>
              <span class="actions">
                <button v-if="hasPermission('rbac:permission:update')" :disabled="loading" @click="openPermissionModal(permission)">编辑</button>
                <button v-if="hasPermission('rbac:permission:delete')" class="danger" :disabled="loading" @click="deletePermission(permission)">删除</button>
              </span>
            </div>
            <div v-if="permissionMenuRows.length === 0" class="empty-row">暂无菜单权限数据</div>
          </div>
        </section>
      </section>

      <section v-show="activeTab === 'rbacRoles'" class="admin-page">
        <section class="query-panel">
          <form class="query-grid" @submit.prevent="searchRoles">
            <label>
              角色关键字：
              <input v-model="roleQuery.keyword" placeholder="角色编码、角色名称" />
            </label>
            <label>
              角色状态：
              <select v-model="roleQuery.status">
                <option value="">全部</option>
                <option value="ENABLED">启用</option>
                <option value="DISABLED">停用</option>
              </select>
            </label>
            <div class="query-actions">
              <button class="primary" type="submit" :disabled="loading">搜索</button>
              <button type="button" :disabled="loading" @click="resetRoleQuery">重置</button>
            </div>
          </form>
        </section>

        <section class="rbac-layout">
          <div class="data-panel">
            <div class="panel-toolbar">
              <h2>角色列表</h2>
              <button v-if="hasPermission('rbac:role:create')" class="primary" @click="openRoleModal()">新增角色</button>
            </div>
            <div class="data-table role-table">
              <div class="table-row table-head">
                <span>角色</span>
                <span>编码</span>
                <span>状态</span>
                <span>操作</span>
              </div>
              <div
                v-for="role in visibleRoles"
                :key="role.id"
                :class="['table-row', { selected: selectedRoleId === role.id }]"
                @click="selectRole(role)"
              >
                <span>{{ role.name }}</span>
                <span>{{ role.code }}</span>
                <span><b class="status-tag">{{ statusText(role.status) }}</b></span>
                <span class="actions" @click.stop>
                  <button v-if="hasPermission('rbac:role:update')" :disabled="loading" @click="openRoleModal(role)">编辑</button>
                  <button v-if="hasPermission('rbac:role:delete')" class="danger" :disabled="loading || role.code === 'ADMIN'" @click="deleteRole(role)">删除</button>
                </span>
              </div>
              <div v-if="visibleRoles.length === 0" class="empty-row">暂无角色数据</div>
            </div>
            <div class="pagination-bar">
              <div class="pagination-info">
                当前第 {{ rolePagination.pageNo }} 页，每页
                <select v-model.number="rolePagination.pageSize" :disabled="loading" @change="changePageSize(rolePagination, loadRoles)">
                  <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
                </select>
                条，共 {{ rolePagination.total }} 条
              </div>
              <div class="pagination-actions">
                <button :disabled="loading || rolePagination.pageNo <= 1" @click="changePage(rolePagination, loadRoles, rolePagination.pageNo - 1)">上一页</button>
                <span>{{ rolePagination.pageNo }} / {{ totalPages(rolePagination) }}</span>
                <button :disabled="loading || rolePagination.pageNo >= totalPages(rolePagination)" @click="changePage(rolePagination, loadRoles, rolePagination.pageNo + 1)">下一页</button>
              </div>
            </div>
          </div>

          <div class="data-panel permission-panel">
            <div class="panel-toolbar">
              <h2>菜单与按钮授权</h2>
              <button v-if="hasPermission('rbac:role-permission:save')" class="primary" :disabled="!selectedRoleId || saving" @click="saveRolePermissions">保存授权</button>
            </div>
            <div v-if="selectedRoleId" class="permission-grid">
              <label v-for="permission in rolePermissionRows" :key="permission.id" class="check-row permission-check-row" :style="{ marginLeft: `${permission.level * 16}px` }">
                <button
                  v-if="permission.hasChildren"
                  type="button"
                  class="tree-toggle"
                  :aria-label="isRolePermissionExpanded(permission.id) ? '收起子权限' : '展开子权限'"
                  @click.prevent="toggleRolePermissionExpand(permission.id)"
                >
                  {{ isRolePermissionExpanded(permission.id) ? '-' : '+' }}
                </button>
                <i v-else class="tree-spacer"></i>
                <input
                  type="checkbox"
                  :checked="selectedPermissionIds.includes(permission.id)"
                  @change="toggleRolePermission(permission, $event.target.checked)"
                />
                <span>
                  <b>{{ permission.name }}</b>
                  <small>{{ permissionTypeText(permission.type) }} · {{ permission.code }}</small>
                </span>
              </label>
            </div>
            <div v-else class="empty-row">请选择左侧角色</div>
          </div>
        </section>
      </section>

      <section v-show="activeTab === 'rbacUsers'" class="admin-page">
        <section class="data-panel">
          <div class="panel-toolbar">
            <h2>用户角色授权</h2>
            <form class="inline-search" @submit.prevent="searchRbacUsers">
              <input v-model="rbacUserQuery.keyword" placeholder="用户姓名、邮箱" />
              <button class="primary" type="submit" :disabled="loading">搜索</button>
            </form>
            <button v-if="hasPermission('rbac:user:create')" class="primary" :disabled="loading" @click="openUserCreateModal">新增用户</button>
          </div>
          <div class="data-table rbac-user-table">
            <div class="table-row table-head">
              <span>用户</span>
              <span>邮箱</span>
              <span>状态</span>
              <span>角色</span>
              <span>操作</span>
            </div>
            <div v-for="user in rbacUsers" :key="user.id" class="table-row">
              <span>{{ user.name }}</span>
              <span>{{ user.email }}</span>
              <span><b class="status-tag">{{ statusText(user.status) }}</b></span>
              <span>{{ user.role === 'ADMIN' ? '系统管理员' : ((user.roleNames || []).join('、') || '-') }}</span>
              <span class="actions">
                <button v-if="hasPermission('rbac:user-password:reset')" :disabled="loading" @click="openResetPasswordModal(user)">重置密码</button>
                <button v-if="user.role !== 'ADMIN' && hasPermission('rbac:user-role:save')" :disabled="loading" @click="openUserRoleModal(user)">分配角色</button>
              </span>
            </div>
            <div v-if="rbacUsers.length === 0" class="empty-row">暂无用户数据</div>
          </div>
          <div class="pagination-bar">
            <div class="pagination-info">
              当前第 {{ rbacUserPagination.pageNo }} 页，每页
              <select v-model.number="rbacUserPagination.pageSize" :disabled="loading" @change="changePageSize(rbacUserPagination, loadRbacUsers)">
                <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
              </select>
              条，共 {{ rbacUserPagination.total }} 条
            </div>
            <div class="pagination-actions">
              <button :disabled="loading || rbacUserPagination.pageNo <= 1" @click="changePage(rbacUserPagination, loadRbacUsers, rbacUserPagination.pageNo - 1)">上一页</button>
              <span>{{ rbacUserPagination.pageNo }} / {{ totalPages(rbacUserPagination) }}</span>
              <button :disabled="loading || rbacUserPagination.pageNo >= totalPages(rbacUserPagination)" @click="changePage(rbacUserPagination, loadRbacUsers, rbacUserPagination.pageNo + 1)">下一页</button>
            </div>
          </div>
        </section>
      </section>
    </main>

    <div v-if="createModal" class="modal-mask">
      <section class="modal-panel">
        <div class="modal-header">
          <h2>{{ createModalTitle }}</h2>
          <button class="icon-button" @click="closeCreateModal">×</button>
        </div>

        <form v-if="createModal === 'jobs'" class="form-grid" @submit.prevent="saveJob">
          <label>
            岗位名称
            <input v-model="jobForm.title" placeholder="Java 后端工程师" />
          </label>
          <label>
            岗位 JD
            <textarea v-model="jobForm.jd" placeholder="岗位职责、业务场景、技术栈"></textarea>
          </label>
          <label>
            能力要求
            <textarea v-model="jobForm.requirements" placeholder="专业能力、项目经验、沟通表达"></textarea>
          </label>
          <label>
            岗位状态
            <button
              type="button"
              :class="['switch-control form-switch', { active: jobForm.status === 'ENABLED' }]"
              @click="toggleJobFormStatus"
            >
              <i></i>
              <b>{{ statusText(jobForm.status) }}</b>
            </button>
          </label>
          <div class="modal-actions">
            <button type="button" :disabled="saving" @click="closeCreateModal">取消</button>
            <button class="primary" type="submit" :disabled="saving">{{ saving ? '处理中' : (editingJobId ? '更新' : '保存') }}</button>
          </div>
        </form>

        <form v-if="createModal === 'candidates'" class="form-grid" @submit.prevent="saveCandidate">
          <label>
            绑定岗位
            <select v-model="candidateForm.jobId">
              <option value="">请选择岗位</option>
              <option v-for="job in enabledJobOptions" :key="job.id" :value="job.id">{{ job.title }}</option>
            </select>
          </label>
          <label>
            姓名
            <input v-model="candidateForm.name" placeholder="张三" />
          </label>
          <div class="inline-fields">
            <label>
              性别
              <select v-model="candidateForm.gender">
                <option value="">请选择性别</option>
                <option value="MALE">男</option>
                <option value="FEMALE">女</option>
                <option value="UNKNOWN">未知</option>
              </select>
            </label>
            <label>
              年龄
              <input v-model.number="candidateForm.age" type="number" min="0" max="120" placeholder="28" />
            </label>
          </div>
          <label>
            手机号
            <input v-model="candidateForm.phone" placeholder="13800000000" />
          </label>
          <label>
            邮箱
            <input v-model="candidateForm.email" placeholder="candidate@example.com" />
          </label>
          <div class="form-field">
            <span>简历内容</span>
            <div class="resume-editor-section">
              <div class="resume-editor-actions">
                <label class="upload-button">
                  上传 PDF 解析
                  <input type="file" accept="application/pdf" @change="parseResumePdf" />
                </label>
              </div>
              <RichTextEditor
                v-model="candidateForm.resumeText"
                placeholder="粘贴候选人简历内容，或上传 PDF 自动解析"
              />
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" :disabled="saving" @click="closeCreateModal">取消</button>
            <button class="primary" type="submit" :disabled="saving">{{ saving ? '处理中' : (editingCandidateId ? '更新' : '保存') }}</button>
          </div>
        </form>

        <form v-if="createModal === 'interviews'" class="form-grid" @submit.prevent="createInterview">
          <label>
            岗位
            <select v-model="interviewForm.jobId" @change="onInterviewJobChange">
              <option value="">请选择岗位</option>
              <option v-for="job in enabledJobOptions" :key="job.id" :value="job.id">{{ job.title }}</option>
            </select>
          </label>
          <label>
            候选人
            <select v-model="interviewForm.candidateId" @change="onInterviewCandidateChange">
              <option value="">请选择候选人</option>
              <option v-for="candidate in interviewCandidateOptions" :key="candidate.id" :value="candidate.id">
                {{ candidateOptionLabel(candidate) }}
              </option>
            </select>
          </label>
          <div class="modal-actions">
            <button type="button" :disabled="saving" @click="closeCreateModal">取消</button>
            <button class="primary" type="submit" :disabled="saving">{{ saving ? '处理中' : '保存' }}</button>
          </div>
        </form>
      </section>
    </div>

    <div v-if="showPasswordModal" class="modal-mask">
      <section class="modal-panel small">
        <div class="modal-header">
          <h2>修改密码</h2>
          <button class="icon-button" @click="closePasswordModal">×</button>
        </div>
        <form class="form-grid" @submit.prevent="changePassword">
          <label>
            原密码
            <input v-model="passwordForm.oldPassword" type="password" placeholder="请输入原密码" />
          </label>
          <label>
            新密码
            <input v-model="passwordForm.newPassword" type="password" placeholder="至少 8 位" />
          </label>
          <label>
            确认新密码
            <input v-model="passwordForm.confirmPassword" type="password" placeholder="再次输入新密码" />
          </label>
          <div class="modal-actions">
            <button type="button" :disabled="saving" @click="closePasswordModal">取消</button>
            <button class="primary" type="submit" :disabled="saving">{{ saving ? '处理中' : '保存' }}</button>
          </div>
        </form>
      </section>
    </div>

    <div v-if="inviteModal" class="modal-mask">
      <section class="modal-panel small">
        <div class="modal-header">
          <h2>面试邀请</h2>
          <button class="icon-button" @click="closeInviteModal">×</button>
        </div>
        <div class="invite-box">
          <div class="invite-copy-content">邀请信息已生成，点击一键复制即可发送给候选人。</div>
        </div>
        <div class="modal-actions">
          <button type="button" @click="closeInviteModal">关闭</button>
          <button class="primary" type="button" @click="copyInviteInfo">复制地址和口令</button>
        </div>
      </section>
    </div>

    <div v-if="resumePreviewModal" class="modal-mask" @click.self="closeResumePreview">
      <section class="modal-panel resume-preview-panel">
        <div class="modal-header">
          <h2>{{ resumePreview.name }}的简历</h2>
          <button class="icon-button" @click="closeResumePreview">×</button>
        </div>
        <div v-if="resumePreview.html" class="resume-preview-content" v-html="resumePreview.html"></div>
        <div v-else class="empty-row">暂无简历内容</div>
        <div class="modal-actions">
          <button type="button" @click="closeResumePreview">关闭</button>
        </div>
      </section>
    </div>

    <div v-if="jobPreviewModal" class="modal-mask" @click.self="closeJobPreview">
      <section class="modal-panel job-preview-panel">
        <div class="modal-header">
          <h2>{{ jobPreview.title }} - {{ jobPreview.fieldName }}</h2>
          <button class="icon-button" @click="closeJobPreview">×</button>
        </div>
        <div v-if="jobPreview.content" class="job-preview-content">{{ jobPreview.content }}</div>
        <div v-else class="empty-row">暂无内容</div>
        <div class="modal-actions">
          <button type="button" @click="closeJobPreview">关闭</button>
        </div>
      </section>
    </div>

    <div v-if="reportModal" class="modal-mask" @click.self="closeReportModal">
      <section class="modal-panel report-panel">
        <div class="modal-header">
          <h2>面试评分报告</h2>
          <button class="icon-button" @click="closeReportModal">×</button>
        </div>
        <div class="report-summary">
          <strong>{{ reportDetail.totalScore ?? '-' }}</strong>
          <span>{{ recommendationText(reportDetail.recommendation) }}</span>
        </div>
        <div class="score-grid">
          <div v-for="dimension in reportDimensions" :key="dimension.name" class="score-item">
            <b>{{ dimension.name }}</b>
            <strong>{{ dimension.score }}</strong>
            <p>{{ dimension.comment }}</p>
          </div>
        </div>
        <div class="report-section">
          <h3>候选人优势</h3>
          <p>{{ reportDetail.strengths || '-' }}</p>
        </div>
        <div class="report-section">
          <h3>风险点</h3>
          <p>{{ reportDetail.risks || '-' }}</p>
        </div>
        <div class="report-section">
          <h3>建议追问</h3>
          <p v-for="question in reportQuestions" :key="question">{{ question }}</p>
          <p v-if="reportQuestions.length === 0">-</p>
        </div>
        <div class="modal-actions">
          <button type="button" @click="closeReportModal">关闭</button>
        </div>
      </section>
    </div>

    <div v-if="messagesModal" class="modal-mask" @click.self="closeMessagesModal">
      <section class="modal-panel report-panel">
        <div class="modal-header">
          <h2>面试对话记录</h2>
          <button class="icon-button" @click="closeMessagesModal">×</button>
        </div>
        <div class="message-list">
          <div v-for="message in messageRecords" :key="message.id" class="message-record">
            <b>{{ message.role === 'CANDIDATE' ? '候选人' : 'AI 面试官' }}</b>
            <p>{{ message.content }}</p>
          </div>
          <div v-if="messageRecords.length === 0" class="empty-row">暂无对话记录</div>
        </div>
        <div class="modal-actions">
          <button type="button" @click="closeMessagesModal">关闭</button>
        </div>
      </section>
    </div>

    <div v-if="permissionModal" class="modal-mask">
      <section class="modal-panel">
        <div class="modal-header">
          <h2>{{ editingPermissionId ? '编辑菜单权限' : '新增菜单权限' }}</h2>
          <button class="icon-button" @click="closePermissionModal">×</button>
        </div>
        <form class="form-grid" @submit.prevent="savePermission">
          <label>
            父级
            <select v-model.number="permissionForm.parentId">
              <option :value="0">根节点</option>
              <option v-for="permission in permissionParentOptions" :key="permission.id" :value="permission.id">
                {{ '　'.repeat(permission.level) }}{{ permission.name }}
              </option>
            </select>
          </label>
          <label>
            类型
            <select v-model="permissionForm.type">
              <option value="MENU">菜单</option>
              <option value="BUTTON">按钮</option>
              <option value="API">接口</option>
            </select>
          </label>
          <label>
            权限编码
            <input v-model="permissionForm.code" :disabled="!!editingPermissionId" placeholder="menu:system" />
          </label>
          <label>
            名称
            <input v-model="permissionForm.name" placeholder="系统管理" />
          </label>
          <label>
            前端标识
            <input v-model="permissionForm.permissionKey" placeholder="rbacRoles" />
          </label>
          <label>
            资源路径
            <input v-model="permissionForm.resourcePath" placeholder="/api/rbac/roles/list" />
          </label>
          <label>
            组件标识
            <input v-model="permissionForm.component" placeholder="rbacRoles" />
          </label>
          <label>
            排序
            <input v-model.number="permissionForm.sortNo" type="number" min="0" />
          </label>
          <label>
            权限说明
            <textarea v-model="permissionForm.description" placeholder="说明这个菜单、按钮或接口权限的用途"></textarea>
          </label>
          <label>
            状态
            <button type="button" :class="['switch-control form-switch', { active: permissionForm.status === 'ENABLED' }]" @click="togglePermissionFormStatus">
              <i></i>
              <b>{{ statusText(permissionForm.status) }}</b>
            </button>
          </label>
          <div class="modal-actions">
            <button type="button" :disabled="saving" @click="closePermissionModal">取消</button>
            <button class="primary" type="submit" :disabled="saving">{{ saving ? '处理中' : '保存' }}</button>
          </div>
        </form>
      </section>
    </div>

    <div v-if="roleModal" class="modal-mask">
      <section class="modal-panel small">
        <div class="modal-header">
          <h2>{{ editingRoleId ? '编辑角色' : '新增角色' }}</h2>
          <button class="icon-button" @click="closeRoleModal">×</button>
        </div>
        <form class="form-grid" @submit.prevent="saveRole">
          <label>
            角色编码
            <input v-model="roleForm.code" :disabled="!!editingRoleId" placeholder="INTERVIEWER" />
          </label>
          <label>
            角色名称
            <input v-model="roleForm.name" placeholder="面试官" />
          </label>
          <label>
            角色说明
            <textarea v-model="roleForm.description" placeholder="描述这个角色的职责范围"></textarea>
          </label>
          <label>
            角色状态
            <button type="button" :class="['switch-control form-switch', { active: roleForm.status === 'ENABLED' }]" @click="toggleRoleFormStatus">
              <i></i>
              <b>{{ statusText(roleForm.status) }}</b>
            </button>
          </label>
          <div class="modal-actions">
            <button type="button" :disabled="saving" @click="closeRoleModal">取消</button>
            <button class="primary" type="submit" :disabled="saving">{{ saving ? '处理中' : '保存' }}</button>
          </div>
        </form>
      </section>
    </div>

    <div v-if="userCreateModal" class="modal-mask">
      <section class="modal-panel small">
        <div class="modal-header">
          <h2>新增用户</h2>
          <button class="icon-button" @click="closeUserCreateModal">×</button>
        </div>
        <form class="form-grid" @submit.prevent="createRbacUser">
          <label>
            姓名
            <input v-model="userForm.name" placeholder="招聘专员" />
          </label>
          <label>
            邮箱
            <input v-model="userForm.email" placeholder="hr@example.com" />
          </label>
          <label>
            初始密码
            <input v-model="userForm.password" type="password" placeholder="至少8位" />
          </label>
          <label>
            状态
            <button type="button" :class="['switch-control form-switch', { active: userForm.status === 'ENABLED' }]" @click="toggleUserFormStatus">
              <i></i>
              <b>{{ statusText(userForm.status) }}</b>
            </button>
          </label>
          <div class="form-wide">
            <b class="field-title">绑定角色</b>
            <div class="role-check-list compact">
              <label v-for="role in assignableRoles" :key="role.id" class="check-row">
                <input v-model="userForm.roleIds" type="checkbox" :value="role.id" />
                <span>
                  <b>{{ role.name }}</b>
                  <small>{{ role.code }}</small>
                </span>
              </label>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" :disabled="saving" @click="closeUserCreateModal">取消</button>
            <button class="primary" type="submit" :disabled="saving">{{ saving ? '处理中' : '保存' }}</button>
          </div>
        </form>
      </section>
    </div>

    <div v-if="resetPasswordModal" class="modal-mask">
      <section class="modal-panel small">
        <div class="modal-header">
          <h2>重置密码</h2>
          <button class="icon-button" @click="closeResetPasswordModal">×</button>
        </div>
        <form class="form-grid" @submit.prevent="resetUserPassword">
          <div class="assign-user-title">
            <b>{{ selectedUser?.name }}</b>
            <small>{{ selectedUser?.email }}</small>
          </div>
          <label>
            新密码
            <input v-model="resetPasswordForm.newPassword" type="password" placeholder="至少8位" />
          </label>
          <div class="modal-actions">
            <button type="button" :disabled="saving" @click="closeResetPasswordModal">取消</button>
            <button class="primary" type="submit" :disabled="saving">{{ saving ? '处理中' : '保存' }}</button>
          </div>
        </form>
      </section>
    </div>

    <div v-if="userRoleModal" class="modal-mask">
      <section class="modal-panel small">
        <div class="modal-header">
          <h2>分配角色</h2>
          <button class="icon-button" @click="closeUserRoleModal">×</button>
        </div>
        <div class="assign-user-title">
          <b>{{ selectedUser?.name }}</b>
          <small>{{ selectedUser?.email }}</small>
        </div>
        <div class="role-check-list">
          <label v-for="role in assignableRoles" :key="role.id" class="check-row">
            <input v-model="selectedUserRoleIds" type="checkbox" :value="role.id" />
            <span>
              <b>{{ role.name }}</b>
              <small>{{ role.code }}</small>
            </span>
          </label>
        </div>
        <div class="modal-actions">
          <button type="button" :disabled="saving" @click="closeUserRoleModal">取消</button>
          <button class="primary" type="button" :disabled="saving" @click="saveUserRoles">{{ saving ? '处理中' : '保存' }}</button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { BarChart3, BriefcaseBusiness, IdCard, ShieldCheck, SquareMenu, UserRoundCog, UsersRound, Video } from '@lucide/vue'
import { authApi, candidateApi, interviewApi, jobApi, rbacApi } from '../api/hr'
import AppMenu from '../components/AppMenu.vue'
import RichTextEditor from '../components/RichTextEditor.vue'
import { showError, showSuccess } from '../utils/message'
import brandLogo from '../assets/shexiangjia-logo.png'

const router = useRouter()
const activeTab = ref('jobs')
const systemMenuOpen = ref(false)
const jobs = ref([])
const candidates = ref([])
const interviews = ref([])
const roles = ref([])
const allRoles = ref([])
const permissions = ref([])
const expandedPermissionIds = ref([])
const rbacUsers = ref([])
const jobOptions = ref([])
const candidateOptions = ref([])
const currentUser = ref(readCurrentUser())
const createModal = ref('')
const showPasswordModal = ref(false)
const inviteModal = ref(false)
const resumePreviewModal = ref(false)
const jobPreviewModal = ref(false)
const reportModal = ref(false)
const messagesModal = ref(false)
const permissionModal = ref(false)
const roleModal = ref(false)
const userCreateModal = ref(false)
const resetPasswordModal = ref(false)
const userRoleModal = ref(false)
const editingJobId = ref(null)
const editingCandidateId = ref(null)
const editingPermissionId = ref(null)
const editingRoleId = ref(null)
const selectedRoleId = ref(null)
const selectedUser = ref(null)
const selectedPermissionIds = ref([])
const expandedRolePermissionIds = ref([])
const selectedUserRoleIds = ref([])
const loading = ref(false)
const saving = ref(false)

const jobQuery = reactive({ keyword: '', status: '' })
const candidateQuery = reactive({ keyword: '', jobId: '' })
const interviewQuery = reactive({ jobId: '', candidateId: '', status: '' })
const roleQuery = reactive({ keyword: '', status: '' })
const rbacUserQuery = reactive({ keyword: '', status: '' })
const pageSizeOptions = [10, 20, 50]
const jobPagination = reactive({ pageNo: 1, pageSize: 10, total: 0 })
const candidatePagination = reactive({ pageNo: 1, pageSize: 10, total: 0 })
const interviewPagination = reactive({ pageNo: 1, pageSize: 10, total: 0 })
const rolePagination = reactive({ pageNo: 1, pageSize: 10, total: 0 })
const rbacUserPagination = reactive({ pageNo: 1, pageSize: 10, total: 0 })

const jobForm = reactive({
  title: '',
  jd: '',
  requirements: '',
  status: 'ENABLED',
  dimensions: []
})

const candidateForm = reactive({
  jobId: '',
  name: '',
  gender: '',
  age: null,
  phone: '',
  email: '',
  resumeText: ''
})

const resumePreview = reactive({
  name: '',
  html: ''
})

const jobPreview = reactive({
  title: '',
  fieldName: '',
  content: ''
})

const reportDetail = reactive({
  totalScore: null,
  dimensionScoresJson: '',
  strengths: '',
  risks: '',
  recommendation: '',
  followUpQuestions: ''
})

const messageRecords = ref([])

const interviewForm = reactive({
  jobId: '',
  candidateId: ''
})

const interviewAccessCodes = reactive({})

const inviteInfo = reactive({
  url: '',
  accessCode: ''
})

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const roleForm = reactive({
  code: '',
  name: '',
  description: '',
  status: 'ENABLED'
})

const permissionForm = reactive({
  parentId: 0,
  code: '',
  permissionKey: '',
  name: '',
  type: 'MENU',
  resourcePath: '',
  component: '',
  description: '',
  sortNo: 100,
  status: 'ENABLED'
})

const userForm = reactive({
  name: '',
  email: '',
  password: '',
  status: 'ENABLED',
  roleIds: []
})

const resetPasswordForm = reactive({
  newPassword: ''
})

const locationOrigin = window.location.origin

const userInitial = computed(() => {
  const name = currentUser.value?.name || '管'
  return name.slice(0, 1)
})

const createModalTitle = computed(() => {
  if (createModal.value === 'jobs') return editingJobId.value ? '编辑岗位' : '新增岗位'
  if (createModal.value === 'candidates') return editingCandidateId.value ? '编辑候选人' : '新增候选人'
  return '新增面试'
})

const reportDimensions = computed(() => parseJsonArray(reportDetail.dimensionScoresJson))
const reportQuestions = computed(() => parseJsonArray(reportDetail.followUpQuestions))
const isRbacTab = computed(() => ['rbacMenus', 'rbacRoles', 'rbacUsers'].includes(activeTab.value))
const hasSystemMenu = computed(() => hasPermission('menu:rbac') || hasPermission('menu:rbac:menus') || hasPermission('menu:rbac:roles') || hasPermission('menu:rbac:users'))
const permissionRows = computed(() => flattenPermissions(permissions.value))
const permissionMenuRows = computed(() => flattenPermissions(permissions.value, expandedPermissionIds.value, true))
const rolePermissionRows = computed(() => flattenPermissions(permissions.value, expandedRolePermissionIds.value, true))
const permissionParentOptions = computed(() => permissionRows.value.filter(item => item.id !== editingPermissionId.value && item.type === 'MENU'))
const visibleRoles = computed(() => roles.value.filter(role => role.code !== 'ADMIN'))
const assignableRoles = computed(() => allRoles.value.filter(role => role.code !== 'ADMIN'))
const enabledJobOptions = computed(() => jobOptions.value.filter(item => item.status === 'ENABLED'))
const interviewCandidateOptions = computed(() => {
  if (!interviewForm.jobId) {
    return candidateOptions.value
  }
  return candidateOptions.value.filter(item => String(item.jobId) === String(interviewForm.jobId))
})
const menuItems = computed(() => {
  const items = []
  if (hasPermission('menu:jobs')) {
    items.push({ key: 'jobs', label: '岗位管理', icon: BriefcaseBusiness, active: activeTab.value === 'jobs' })
  }
  if (hasPermission('menu:candidates')) {
    items.push({ key: 'candidates', label: '候选人管理', icon: UsersRound, active: activeTab.value === 'candidates' })
  }
  if (hasPermission('menu:interviews')) {
    items.push({ key: 'interviews', label: '面试管理', icon: Video, active: activeTab.value === 'interviews' })
    items.push({ key: 'interviewResults', label: '面试结果', icon: BarChart3, active: false })
  }
  const rbacChildren = [
    hasPermission('menu:rbac:menus')
      ? { key: 'rbacMenus', label: '菜单管理', icon: SquareMenu, active: activeTab.value === 'rbacMenus' }
      : null,
    hasPermission('menu:rbac:roles')
      ? { key: 'rbacRoles', label: '角色管理', icon: IdCard, active: activeTab.value === 'rbacRoles' }
      : null,
    hasPermission('menu:rbac:users')
      ? { key: 'rbacUsers', label: '用户管理', icon: UserRoundCog, active: activeTab.value === 'rbacUsers' }
      : null
  ].filter(Boolean)
  if (hasSystemMenu.value) {
    items.push({
      key: 'rbac',
      label: '权限管理',
      icon: ShieldCheck,
      active: isRbacTab.value,
      open: systemMenuOpen.value,
      children: rbacChildren
    })
  }
  return items
})
const activeTabTitle = computed(() => {
  const map = {
    jobs: '岗位管理',
    candidates: '候选人管理',
    interviews: '面试管理',
    rbacMenus: '菜单管理',
    rbacRoles: '角色管理',
    rbacUsers: '用户管理'
  }
  return map[activeTab.value] || '工作台'
})
const activeTabDesc = computed(() => {
  const map = {
    jobs: '维护岗位 JD、能力要求和启停状态',
    candidates: '管理候选人资料、简历和绑定岗位',
    interviews: '创建邀请、查看对话和面试报告',
    rbacMenus: '维护菜单、按钮和接口权限节点',
    rbacRoles: '维护角色并分配菜单和按钮权限',
    rbacUsers: '维护用户与角色的绑定关系'
  }
  return map[activeTab.value] || '奢享家 HR 管理系统'
})

onMounted(async () => {
  await reload()
})

function readCurrentUser() {
  const raw = localStorage.getItem('hr_user')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (err) {
    return null
  }
}

function hasPermission(code) {
  const codes = currentUser.value?.permissionCodes || []
  return codes.includes('*') || codes.includes(code)
}

function tabPermissionCode(tab) {
  const map = {
    jobs: 'menu:jobs',
    candidates: 'menu:candidates',
    interviews: 'menu:interviews',
    rbacMenus: 'menu:rbac:menus',
    rbacRoles: 'menu:rbac:roles',
    rbacUsers: 'menu:rbac:users'
  }
  return map[tab] || ''
}

function ensureAllowedActiveTab() {
  if (hasPermission(tabPermissionCode(activeTab.value))) {
    return
  }
  const next = [
    ['jobs', 'menu:jobs'],
    ['candidates', 'menu:candidates'],
    ['interviews', 'menu:interviews'],
    ['rbacMenus', 'menu:rbac:menus'],
    ['rbacRoles', 'menu:rbac:roles'],
    ['rbacUsers', 'menu:rbac:users']
  ].find(([, code]) => hasPermission(code))
  if (next) {
    activeTab.value = next[0]
    systemMenuOpen.value = activeTab.value.startsWith('rbac')
  }
}

function switchTab(tab) {
  if (tab === 'jobs' && !hasPermission('menu:jobs')) return
  if (tab === 'candidates' && !hasPermission('menu:candidates')) return
  if (tab === 'interviews' && !hasPermission('menu:interviews')) return
  if (tab === 'rbacMenus' && !hasPermission('menu:rbac:menus')) return
  if (tab === 'rbacRoles' && !hasPermission('menu:rbac:roles')) return
  if (tab === 'rbacUsers' && !hasPermission('menu:rbac:users')) return
  activeTab.value = tab
  if (['rbacMenus', 'rbacRoles', 'rbacUsers'].includes(tab)) {
    systemMenuOpen.value = true
  }
  if (tab === 'rbacMenus') {
    loadRbacBaseData()
  }
  if (tab === 'rbacRoles') {
    loadRbacBaseData()
    loadRoles()
  }
  if (tab === 'rbacUsers') {
    loadRbacBaseData()
    loadRbacUsers()
  }
}

function handleMenuSelect(key) {
  if (key === 'rbac') {
    toggleSystemMenu()
    return
  }
  if (key === 'interviewResults') {
    router.push('/hr/interview-results')
    return
  }
  switchTab(key)
}

function toggleSystemMenu() {
  systemMenuOpen.value = !systemMenuOpen.value
  if (systemMenuOpen.value && !isRbacTab.value) {
    const firstAllowedTab = firstAllowedRbacTab()
    if (firstAllowedTab) {
      switchTab(firstAllowedTab)
    }
  }
}

function firstAllowedRbacTab() {
  return [
    ['rbacMenus', 'menu:rbac:menus'],
    ['rbacRoles', 'menu:rbac:roles'],
    ['rbacUsers', 'menu:rbac:users']
  ].find(([, code]) => hasPermission(code))?.[0] || ''
}

async function reload() {
  try {
    loading.value = true
    const user = await authApi.me({})
    currentUser.value = user
    localStorage.setItem('hr_user', JSON.stringify(user))
    ensureAllowedActiveTab()
    await Promise.all([
      hasPermission('menu:jobs') ? loadJobs() : Promise.resolve(),
      hasPermission('menu:candidates') ? loadCandidates() : Promise.resolve(),
      hasPermission('menu:interviews') ? loadInterviews() : Promise.resolve(),
      shouldLoadJobOptions() ? loadJobOptions() : Promise.resolve(),
      shouldLoadCandidateOptions() ? loadCandidateOptions() : Promise.resolve(),
      hasSystemMenu.value ? loadRbacBaseData() : Promise.resolve(),
      hasPermission('menu:rbac:roles') ? loadRoles() : Promise.resolve(),
      hasPermission('menu:rbac:users') ? loadRbacUsers() : Promise.resolve()
    ])
  } catch (err) {
  } finally {
    loading.value = false
  }
}

async function loadJobs() {
  return withLoading(async () => {
    const page = await jobApi.list({
      pageNo: jobPagination.pageNo,
      pageSize: jobPagination.pageSize,
      keyword: jobQuery.keyword,
      status: jobQuery.status
    })
    jobs.value = page.records || []
    updatePagination(jobPagination, page)
  })
}

async function loadCandidates() {
  return withLoading(async () => {
    const page = await candidateApi.list({
      pageNo: candidatePagination.pageNo,
      pageSize: candidatePagination.pageSize,
      keyword: candidateQuery.keyword,
      jobId: candidateQuery.jobId ? Number(candidateQuery.jobId) : null
    })
    candidates.value = page.records || []
    updatePagination(candidatePagination, page)
  })
}

async function loadInterviews() {
  return withLoading(async () => {
    const page = await interviewApi.list({
      pageNo: interviewPagination.pageNo,
      pageSize: interviewPagination.pageSize,
      jobId: interviewQuery.jobId ? Number(interviewQuery.jobId) : null,
      candidateId: interviewQuery.candidateId ? Number(interviewQuery.candidateId) : null,
      status: interviewQuery.status
    })
    interviews.value = (page.records || []).map(interview => ({
      ...interview,
      accessCode: interview.accessCode || interviewAccessCodes[interview.id] || ''
    }))
    updatePagination(interviewPagination, page)
  })
}

async function loadRoles() {
  return withLoading(async () => {
    const page = await rbacApi.roles({
      pageNo: rolePagination.pageNo,
      pageSize: rolePagination.pageSize,
      keyword: roleQuery.keyword,
      status: roleQuery.status
    })
    roles.value = (page.records || []).filter(role => role.code !== 'ADMIN')
    updatePagination(rolePagination, page)
    if (!selectedRoleId.value && roles.value.length > 0) {
      await selectRole(roles.value[0])
    }
  })
}

async function loadRbacUsers() {
  return withLoading(async () => {
    const page = await rbacApi.users({
      pageNo: rbacUserPagination.pageNo,
      pageSize: rbacUserPagination.pageSize,
      keyword: rbacUserQuery.keyword,
      status: rbacUserQuery.status
    })
    rbacUsers.value = page.records || []
    updatePagination(rbacUserPagination, page)
  })
}

async function loadRbacBaseData() {
  const [permissionList, rolePage] = await Promise.all([
    rbacApi.permissions({}),
    rbacApi.roles({ pageNo: 1, pageSize: 200, keyword: '', status: '' })
  ])
  permissions.value = permissionList || []
  allRoles.value = (rolePage.records || []).filter(role => role.code !== 'ADMIN')
  expandedPermissionIds.value = expandedPermissionIds.value.filter(id => permissions.value.some(item => item.id === id))
  expandedRolePermissionIds.value = expandedRolePermissionIds.value.filter(id => permissions.value.some(item => item.id === id))
}

async function loadJobOptions() {
  if (!hasPermission('menu:jobs')) {
    jobOptions.value = []
    return
  }
  const page = await jobApi.list({
    pageNo: 1,
    pageSize: 200,
    keyword: '',
    status: ''
  })
  jobOptions.value = page.records || []
}

async function loadCandidateOptions() {
  if (!hasPermission('menu:candidates')) {
    candidateOptions.value = []
    return
  }
  const page = await candidateApi.list({
    pageNo: 1,
    pageSize: 200,
    keyword: '',
    jobId: null
  })
  candidateOptions.value = page.records || []
}

async function refreshJobOptionsIfAllowed() {
  if (shouldLoadJobOptions()) {
    await loadJobOptions()
  }
}

async function refreshCandidateOptionsIfAllowed() {
  if (shouldLoadCandidateOptions()) {
    await loadCandidateOptions()
  }
}

function shouldLoadJobOptions() {
  return hasPermission('menu:jobs') && (
    hasPermission('menu:candidates')
    || hasPermission('menu:interviews')
    || hasPermission('candidate:create')
    || hasPermission('candidate:update')
    || hasPermission('interview:create')
  )
}

function shouldLoadCandidateOptions() {
  return hasPermission('menu:candidates') && (
    hasPermission('menu:interviews')
    || hasPermission('interview:create')
  )
}

function searchJobs() {
  jobPagination.pageNo = 1
  loadJobs()
}

function searchCandidates() {
  candidatePagination.pageNo = 1
  loadCandidates()
}

function searchInterviews() {
  interviewPagination.pageNo = 1
  loadInterviews()
}

function searchRoles() {
  rolePagination.pageNo = 1
  selectedRoleId.value = null
  selectedPermissionIds.value = []
  loadRoles()
}

function searchRbacUsers() {
  rbacUserPagination.pageNo = 1
  loadRbacUsers()
}

function resetJobQuery() {
  jobQuery.keyword = ''
  jobQuery.status = ''
  searchJobs()
}

function resetCandidateQuery() {
  candidateQuery.keyword = ''
  candidateQuery.jobId = ''
  searchCandidates()
}

function resetInterviewQuery() {
  interviewQuery.jobId = ''
  interviewQuery.candidateId = ''
  interviewQuery.status = ''
  searchInterviews()
}

function resetRoleQuery() {
  roleQuery.keyword = ''
  roleQuery.status = ''
  searchRoles()
}

function updatePagination(pagination, page) {
  pagination.total = Number(page?.total || 0)
  pagination.pageNo = Number(page?.pageNo || pagination.pageNo || 1)
  pagination.pageSize = Number(page?.pageSize || pagination.pageSize || 10)
}

function totalPages(pagination) {
  return Math.max(1, Math.ceil(Number(pagination.total || 0) / Number(pagination.pageSize || 10)))
}

function paginationRange(pagination) {
  const total = Number(pagination.total || 0)
  if (total === 0) {
    return '0-0'
  }
  const start = (Number(pagination.pageNo || 1) - 1) * Number(pagination.pageSize || 10) + 1
  const end = Math.min(start + Number(pagination.pageSize || 10) - 1, total)
  return `${start}-${end}`
}

function changePage(pagination, loader, pageNo) {
  pagination.pageNo = Math.min(Math.max(1, pageNo), totalPages(pagination))
  loader()
}

function changePageSize(pagination, loader) {
  pagination.pageNo = 1
  loader()
}

async function openCreateModal(type) {
  if (type === 'jobs') {
    resetJobForm()
    editingJobId.value = null
  }
  if (type === 'candidates') {
    resetCandidateForm()
    editingCandidateId.value = null
    await refreshJobOptionsIfAllowed()
  }
  if (type === 'interviews') {
    interviewForm.jobId = ''
    interviewForm.candidateId = ''
    await Promise.all([
      loadJobOptions(),
      loadCandidateOptions()
    ])
  }
  createModal.value = type
}

function closeCreateModal() {
  if (saving.value) {
    return
  }
  forceCloseCreateModal()
}

function forceCloseCreateModal() {
  createModal.value = ''
  editingJobId.value = null
  editingCandidateId.value = null
}

function openPasswordModal() {
  showPasswordModal.value = true
}

function closePasswordModal() {
  if (saving.value) {
    return
  }
  showPasswordModal.value = false
  passwordForm.oldPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
}

function closeResumePreview() {
  resumePreviewModal.value = false
  resumePreview.name = ''
  resumePreview.html = ''
}

function closeJobPreview() {
  jobPreviewModal.value = false
  jobPreview.title = ''
  jobPreview.fieldName = ''
  jobPreview.content = ''
}

function closeReportModal() {
  reportModal.value = false
  reportDetail.totalScore = null
  reportDetail.dimensionScoresJson = ''
  reportDetail.strengths = ''
  reportDetail.risks = ''
  reportDetail.recommendation = ''
  reportDetail.followUpQuestions = ''
}

function closeMessagesModal() {
  messagesModal.value = false
  messageRecords.value = []
}

function closeInviteModal() {
  inviteModal.value = false
  inviteInfo.url = ''
  inviteInfo.accessCode = ''
}

function openPermissionModal(permission = null) {
  if (permission) {
    editingPermissionId.value = permission.id
    permissionForm.parentId = permission.parentId ?? 0
    permissionForm.code = permission.code || ''
    permissionForm.permissionKey = permission.permissionKey || ''
    permissionForm.name = permission.name || ''
    permissionForm.type = permission.type || 'MENU'
    permissionForm.resourcePath = permission.resourcePath || ''
    permissionForm.component = permission.component || ''
    permissionForm.description = permission.description || ''
    permissionForm.sortNo = permission.sortNo ?? 100
    permissionForm.status = permission.status || 'ENABLED'
  } else {
    editingPermissionId.value = null
    permissionForm.parentId = 0
    permissionForm.code = ''
    permissionForm.permissionKey = ''
    permissionForm.name = ''
    permissionForm.type = 'MENU'
    permissionForm.resourcePath = ''
    permissionForm.component = ''
    permissionForm.description = ''
    permissionForm.sortNo = 100
    permissionForm.status = 'ENABLED'
  }
  permissionModal.value = true
}

function closePermissionModal() {
  if (saving.value) {
    return
  }
  permissionModal.value = false
  editingPermissionId.value = null
}

function openRoleModal(role = null) {
  if (role) {
    editingRoleId.value = role.id
    roleForm.code = role.code || ''
    roleForm.name = role.name || ''
    roleForm.description = role.description || ''
    roleForm.status = role.status || 'ENABLED'
  } else {
    editingRoleId.value = null
    roleForm.code = ''
    roleForm.name = ''
    roleForm.description = ''
    roleForm.status = 'ENABLED'
  }
  roleModal.value = true
}

function closeRoleModal() {
  if (saving.value) {
    return
  }
  roleModal.value = false
  editingRoleId.value = null
}

function openUserCreateModal() {
  userForm.name = ''
  userForm.email = ''
  userForm.password = ''
  userForm.status = 'ENABLED'
  userForm.roleIds = []
  userCreateModal.value = true
}

function closeUserCreateModal() {
  if (saving.value) {
    return
  }
  userCreateModal.value = false
}

function openResetPasswordModal(user) {
  selectedUser.value = user
  resetPasswordForm.newPassword = ''
  resetPasswordModal.value = true
}

function closeResetPasswordModal() {
  if (saving.value) {
    return
  }
  resetPasswordModal.value = false
  selectedUser.value = null
  resetPasswordForm.newPassword = ''
}

function openUserRoleModal(user) {
  if (user.role === 'ADMIN') {
    showError('系统管理员不需要分配角色')
    return
  }
  selectedUser.value = user
  selectedUserRoleIds.value = [...(user.roleIds || [])]
  userRoleModal.value = true
}

function closeUserRoleModal() {
  if (saving.value) {
    return
  }
  userRoleModal.value = false
  selectedUser.value = null
  selectedUserRoleIds.value = []
}

async function logout() {
  try {
    await authApi.logout({})
    showSuccess('退出成功')
  } finally {
    localStorage.removeItem('hr_token')
    localStorage.removeItem('hr_user')
    await router.push('/login')
  }
}

async function changePassword() {
  if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
    showError('请完整填写密码信息')
    return
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    showError('两次输入的新密码不一致')
    return
  }
  try {
    saving.value = true
    await authApi.changePassword(passwordForm)
    closePasswordModal()
    showSuccess('密码修改成功')
  } catch (err) {
  } finally {
    saving.value = false
  }
}

async function selectRole(role) {
  selectedRoleId.value = role.id
  expandedRolePermissionIds.value = []
  try {
    loading.value = true
    const detail = await rbacApi.rolePermissions({ roleId: role.id })
    selectedPermissionIds.value = detail.permissionIds || []
  } catch (err) {
  } finally {
    loading.value = false
  }
}

function toggleRoleFormStatus() {
  roleForm.status = roleForm.status === 'ENABLED' ? 'DISABLED' : 'ENABLED'
}

function togglePermissionFormStatus() {
  permissionForm.status = permissionForm.status === 'ENABLED' ? 'DISABLED' : 'ENABLED'
}

function toggleUserFormStatus() {
  userForm.status = userForm.status === 'ENABLED' ? 'DISABLED' : 'ENABLED'
}

async function savePermission() {
  if (!permissionForm.name.trim()) {
    showError('请输入权限名称')
    return
  }
  if (!editingPermissionId.value && !permissionForm.code.trim()) {
    showError('请输入权限编码')
    return
  }
  try {
    saving.value = true
    const payload = {
      ...permissionForm,
      parentId: Number(permissionForm.parentId || 0),
      sortNo: Number(permissionForm.sortNo || 0)
    }
    if (editingPermissionId.value) {
      await rbacApi.updatePermission({
        id: editingPermissionId.value,
        ...payload
      })
      showSuccess('菜单权限更新成功')
    } else {
      await rbacApi.createPermission(payload)
      showSuccess('菜单权限新增成功')
    }
    closePermissionModal()
    await loadRbacBaseData()
    if (payload.parentId) {
      expandPermissionPath(payload.parentId)
    }
  } catch (err) {
  } finally {
    saving.value = false
  }
}

async function deletePermission(permission) {
  if (!window.confirm(`确认删除「${permission.name}」吗？`)) {
    return
  }
  try {
    loading.value = true
    await rbacApi.deletePermission({ id: permission.id })
    await loadRbacBaseData()
    showSuccess('菜单权限删除成功')
  } catch (err) {
  } finally {
    loading.value = false
  }
}

function isPermissionExpanded(id) {
  return expandedPermissionIds.value.includes(id)
}

function togglePermissionExpand(id) {
  if (isPermissionExpanded(id)) {
    const descendantIds = collectPermissionDescendantIds(id)
    expandedPermissionIds.value = expandedPermissionIds.value.filter(item => item !== id && !descendantIds.includes(item))
    return
  }
  expandedPermissionIds.value = [...expandedPermissionIds.value, id]
}

function isRolePermissionExpanded(id) {
  return expandedRolePermissionIds.value.includes(id)
}

function toggleRolePermissionExpand(id) {
  if (isRolePermissionExpanded(id)) {
    const descendantIds = collectPermissionDescendantIds(id)
    expandedRolePermissionIds.value = expandedRolePermissionIds.value.filter(item => item !== id && !descendantIds.includes(item))
    return
  }
  expandedRolePermissionIds.value = [...expandedRolePermissionIds.value, id]
}

function expandPermissionPath(id) {
  const idMap = new Map((permissions.value || []).map(item => [Number(item.id), item]))
  const ids = new Set(expandedPermissionIds.value)
  let current = idMap.get(Number(id))
  while (current) {
    ids.add(Number(current.id))
    const parentId = Number(current.parentId || 0)
    current = parentId ? idMap.get(parentId) : null
  }
  expandedPermissionIds.value = [...ids]
}

function collectPermissionDescendantIds(id) {
  const childrenMap = buildPermissionChildrenMap(permissions.value)
  const result = []
  const visit = parentId => {
    ;(childrenMap.get(Number(parentId)) || []).forEach(item => {
      result.push(Number(item.id))
      visit(item.id)
    })
  }
  visit(id)
  return result
}

function collectPermissionParentIds(id) {
  const idMap = new Map((permissions.value || []).map(item => [Number(item.id), item]))
  const result = []
  let current = idMap.get(Number(id))
  while (current) {
    const parentId = Number(current.parentId || 0)
    if (!parentId) {
      break
    }
    result.push(parentId)
    current = idMap.get(parentId)
  }
  return result
}

async function saveRole() {
  if (!roleForm.name.trim()) {
    showError('请输入角色名称')
    return
  }
  if (!editingRoleId.value && !roleForm.code.trim()) {
    showError('请输入角色编码')
    return
  }
  try {
    saving.value = true
    if (editingRoleId.value) {
      await rbacApi.updateRole({
        id: editingRoleId.value,
        name: roleForm.name,
        description: roleForm.description,
        status: roleForm.status
      })
      showSuccess('角色更新成功')
    } else {
      await rbacApi.createRole({
        code: roleForm.code,
        name: roleForm.name,
        description: roleForm.description,
        status: roleForm.status
      })
      showSuccess('角色新增成功')
    }
    closeRoleModal()
    await loadRoles()
    await loadRbacBaseData()
  } catch (err) {
  } finally {
    saving.value = false
  }
}

async function deleteRole(role) {
  if (!window.confirm(`确认删除角色「${role.name}」吗？`)) {
    return
  }
  try {
    loading.value = true
    await rbacApi.deleteRole({ id: role.id })
    if (selectedRoleId.value === role.id) {
      selectedRoleId.value = null
      selectedPermissionIds.value = []
    }
    await loadRoles()
    await loadRbacBaseData()
    await loadRbacUsers()
    showSuccess('角色删除成功')
  } catch (err) {
  } finally {
    loading.value = false
  }
}

async function saveRolePermissions() {
  if (!selectedRoleId.value) {
    showError('请选择角色')
    return
  }
  try {
    saving.value = true
    await rbacApi.saveRolePermissions({
      roleId: selectedRoleId.value,
      permissionIds: completeSelectedPermissionIds(selectedPermissionIds.value)
    })
    const detail = await rbacApi.rolePermissions({ roleId: selectedRoleId.value })
    selectedPermissionIds.value = detail.permissionIds || []
    showSuccess('角色权限保存成功')
  } catch (err) {
  } finally {
    saving.value = false
  }
}

function toggleRolePermission(permission, checked) {
  const ids = new Set(selectedPermissionIds.value)
  const id = Number(permission.id)
  if (checked) {
    ids.add(id)
    collectPermissionParentIds(id).forEach(parentId => ids.add(parentId))
  } else {
    ids.delete(id)
    collectPermissionDescendantIds(id).forEach(childId => ids.delete(childId))
  }
  selectedPermissionIds.value = [...ids]
}

function completeSelectedPermissionIds(ids) {
  const completedIds = new Set((ids || []).map(Number))
  ;[...completedIds].forEach(id => {
    collectPermissionParentIds(id).forEach(parentId => completedIds.add(parentId))
  })
  return [...completedIds]
}

async function saveUserRoles() {
  if (!selectedUser.value?.id) {
    showError('请选择用户')
    return
  }
  try {
    saving.value = true
    await rbacApi.saveUserRoles({
      userId: selectedUser.value.id,
      roleIds: selectedUserRoleIds.value
    })
    closeUserRoleModal()
    await loadRbacUsers()
    showSuccess('用户角色保存成功')
  } catch (err) {
  } finally {
    saving.value = false
  }
}

async function createRbacUser() {
  if (!userForm.name.trim()) {
    showError('请输入用户姓名')
    return
  }
  if (!userForm.email.trim()) {
    showError('请输入用户邮箱')
    return
  }
  if (!userForm.password || userForm.password.length < 8) {
    showError('初始密码至少8位')
    return
  }
  try {
    saving.value = true
    await rbacApi.createUser({
      name: userForm.name,
      email: userForm.email,
      password: userForm.password,
      status: userForm.status,
      roleIds: userForm.roleIds
    })
    closeUserCreateModal()
    await loadRbacUsers()
    showSuccess('用户新增成功')
  } catch (err) {
  } finally {
    saving.value = false
  }
}

async function resetUserPassword() {
  if (!selectedUser.value?.id) {
    showError('请选择用户')
    return
  }
  if (!resetPasswordForm.newPassword || resetPasswordForm.newPassword.length < 8) {
    showError('新密码至少8位')
    return
  }
  try {
    saving.value = true
    await rbacApi.resetUserPassword({
      userId: selectedUser.value.id,
      newPassword: resetPasswordForm.newPassword
    })
    closeResetPasswordModal()
    showSuccess('密码重置成功')
  } catch (err) {
  } finally {
    saving.value = false
  }
}

async function createJob() {
  if (!validateJobForm()) {
    return
  }
  try {
    saving.value = true
    await jobApi.create(jobForm)
    resetJobForm()
    forceCloseCreateModal()
    await loadJobs()
    await refreshJobOptionsIfAllowed()
    showSuccess('岗位新增成功')
  } catch (err) {
  } finally {
    saving.value = false
  }
}

async function updateJob() {
  if (!validateJobForm()) {
    return
  }
  try {
    saving.value = true
    await jobApi.update({
      id: editingJobId.value,
      ...jobForm
    })
    resetJobForm()
    forceCloseCreateModal()
    await loadJobs()
    await refreshJobOptionsIfAllowed()
    showSuccess('岗位更新成功')
  } catch (err) {
  } finally {
    saving.value = false
  }
}

async function saveJob() {
  if (editingJobId.value) {
    await updateJob()
  } else {
    await createJob()
  }
}

async function editJob(id) {
  try {
    loading.value = true
    const detail = await jobApi.detail({ id })
    editingJobId.value = id
    jobForm.title = detail.title || ''
    jobForm.jd = detail.jd || ''
    jobForm.requirements = detail.requirements || ''
    jobForm.status = detail.status || 'ENABLED'
    jobForm.dimensions = (detail.dimensions || []).map(item => ({
      name: item.name || '',
      description: item.description || '',
      weight: item.weight ?? 0
    }))
    createModal.value = 'jobs'
  } catch (err) {
  } finally {
    loading.value = false
  }
}

async function toggleJobStatus(job) {
  try {
    loading.value = true
    const detail = await jobApi.detail({ id: job.id })
    const nextStatus = job.status === 'ENABLED' ? 'DISABLED' : 'ENABLED'
    await jobApi.update({
      id: detail.id,
      title: detail.title || '',
      jd: detail.jd || '',
      requirements: detail.requirements || '',
      status: nextStatus,
      dimensions: (detail.dimensions || []).map(item => ({
        name: item.name || '',
        description: item.description || '',
        weight: item.weight ?? 0
      }))
    })
    await loadJobs()
    await refreshJobOptionsIfAllowed()
    showSuccess(nextStatus === 'ENABLED' ? '岗位已启用' : '岗位已停用')
  } catch (err) {
  } finally {
    loading.value = false
  }
}

function toggleJobFormStatus() {
  jobForm.status = jobForm.status === 'ENABLED' ? 'DISABLED' : 'ENABLED'
}

async function deleteJob(id) {
  if (!window.confirm('确认删除这个岗位吗？')) {
    return
  }
  try {
    loading.value = true
    await jobApi.delete({ id })
    await loadJobs()
    await refreshJobOptionsIfAllowed()
    showSuccess('岗位删除成功')
  } catch (err) {
  } finally {
    loading.value = false
  }
}

async function previewJobContent(id, field) {
  try {
    loading.value = true
    const detail = await jobApi.detail({ id })
    jobPreview.title = detail.title || '岗位'
    jobPreview.fieldName = field === 'jd' ? '岗位 JD' : '能力要求'
    jobPreview.content = field === 'jd' ? (detail.jd || '') : (detail.requirements || '')
    jobPreviewModal.value = true
  } catch (err) {
  } finally {
    loading.value = false
  }
}

async function createCandidate() {
  if (!validateCandidateForm()) {
    return
  }
  try {
    saving.value = true
    await candidateApi.create(buildCandidatePayload())
    resetCandidateForm()
    forceCloseCreateModal()
    await loadCandidates()
    await refreshCandidateOptionsIfAllowed()
    showSuccess('候选人新增成功')
  } catch (err) {
  } finally {
    saving.value = false
  }
}

async function updateCandidate() {
  if (!validateCandidateForm()) {
    return
  }
  try {
    saving.value = true
    await candidateApi.update({
      id: editingCandidateId.value,
      ...buildCandidatePayload()
    })
    resetCandidateForm()
    forceCloseCreateModal()
    await loadCandidates()
    await refreshCandidateOptionsIfAllowed()
    showSuccess('候选人更新成功')
  } catch (err) {
  } finally {
    saving.value = false
  }
}

async function saveCandidate() {
  if (editingCandidateId.value) {
    await updateCandidate()
  } else {
    await createCandidate()
  }
}

async function editCandidate(id) {
  try {
    loading.value = true
    const detail = await candidateApi.detail({ id })
    editingCandidateId.value = id
    candidateForm.jobId = detail.jobId || ''
    candidateForm.name = detail.name || ''
    candidateForm.gender = detail.gender || ''
    candidateForm.age = detail.age ?? null
    candidateForm.phone = detail.phone || ''
    candidateForm.email = detail.email || ''
    setResumeEditorHtml(detail.resumeText || '')
    createModal.value = 'candidates'
  } catch (err) {
  } finally {
    loading.value = false
  }
}

async function deleteCandidate(id) {
  if (!window.confirm('确认删除这个候选人吗？')) {
    return
  }
  try {
    loading.value = true
    await candidateApi.delete({ id })
    await loadCandidates()
    await refreshCandidateOptionsIfAllowed()
    showSuccess('候选人删除成功')
  } catch (err) {
  } finally {
    loading.value = false
  }
}

async function previewResume(id) {
  try {
    loading.value = true
    const detail = await candidateApi.detail({ id })
    resumePreview.name = detail.name || '候选人'
    resumePreview.html = detail.resumeText || ''
    resumePreviewModal.value = true
  } catch (err) {
  } finally {
    loading.value = false
  }
}

function setResumeEditorHtml(html) {
  candidateForm.resumeText = html || ''
}

function resetJobForm() {
  jobForm.title = ''
  jobForm.jd = ''
  jobForm.requirements = ''
  jobForm.status = 'ENABLED'
  jobForm.dimensions = []
}

function resetCandidateForm() {
  candidateForm.jobId = ''
  candidateForm.name = ''
  candidateForm.gender = ''
  candidateForm.age = null
  candidateForm.phone = ''
  candidateForm.email = ''
  setResumeEditorHtml('')
}

function validateJobForm() {
  if (!jobForm.title.trim()) {
    showError('请输入岗位名称')
    return false
  }
  if (!jobForm.jd.trim()) {
    showError('请输入岗位 JD')
    return false
  }
  if (!['ENABLED', 'DISABLED'].includes(jobForm.status)) {
    showError('请选择岗位状态')
    return false
  }
  return true
}

function validateCandidateForm() {
  if (!candidateForm.jobId) {
    showError('请选择绑定岗位')
    return false
  }
  if (!candidateForm.name.trim()) {
    showError('请输入候选人姓名')
    return false
  }
  return true
}

function buildCandidatePayload() {
  return {
    ...candidateForm,
    jobId: Number(candidateForm.jobId),
    age: candidateForm.age === '' || candidateForm.age === null ? null : Number(candidateForm.age)
  }
}

async function withLoading(task) {
  const shouldToggle = !loading.value
  try {
    if (shouldToggle) {
      loading.value = true
    }
    return await task()
  } finally {
    if (shouldToggle) {
      loading.value = false
    }
  }
}

async function parseResumePdf(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) {
    return
  }
  try {
    saving.value = true
    const result = await candidateApi.parseResumePdf(file)
    setResumeEditorHtml(result.htmlContent || '')
    applyParsedCandidateProfile(result)
    showSuccess('PDF 简历解析成功')
  } catch (err) {
  } finally {
    saving.value = false
  }
}

function applyParsedCandidateProfile(result) {
  if (!candidateForm.name && result.name) {
    candidateForm.name = result.name
  }
  if (!candidateForm.gender && result.gender) {
    candidateForm.gender = result.gender
  }
  if ((candidateForm.age === null || candidateForm.age === '') && result.age !== null && result.age !== undefined) {
    candidateForm.age = Number(result.age)
  }
  if (!candidateForm.phone && result.phone) {
    candidateForm.phone = result.phone
  }
  if (!candidateForm.email && result.email) {
    candidateForm.email = result.email
  }
}

async function createInterview() {
  if (!interviewForm.jobId || !interviewForm.candidateId) {
    showError('请选择岗位和候选人')
    return
  }
  try {
    saving.value = true
    const result = await interviewApi.create({
      jobId: Number(interviewForm.jobId),
      candidateId: Number(interviewForm.candidateId)
    })
    rememberInterviewAccessCode(result)
    showInviteInfo(result)
    interviewForm.jobId = ''
    interviewForm.candidateId = ''
    forceCloseCreateModal()
    await loadInterviews()
    showSuccess('面试新增成功')
  } catch (err) {
  } finally {
    saving.value = false
  }
}

async function copyInterviewInvite(interview) {
  if (!interview?.id) {
    showError('面试数据异常，无法复制邀请信息')
    return
  }
  let target = interview
  let accessCode = interview.accessCode || interviewAccessCodes[interview.id] || ''
  try {
    loading.value = true
    if (!accessCode) {
      if (!['INVITED', 'WAITING'].includes(interview.status)) {
        showError('面试已开始或已结束，不能重新生成口令')
        return
      }
      target = await interviewApi.resetAccessCode({ id: interview.id })
      rememberInterviewAccessCode(target)
      accessCode = target.accessCode || ''
      await loadInterviews()
    }
  } catch (err) {
    return
  } finally {
    loading.value = false
  }
  if (!accessCode) {
    showError('口令生成失败，请稍后重试')
    return
  }
  try {
    const text = `面试链接：${buildInviteUrl(target)}\n面试口令：${accessCode}`
    await navigator.clipboard.writeText(text)
    showSuccess('邀请信息已复制')
  } catch (err) {
    showError('复制失败，请重新点击按钮或检查浏览器复制权限')
  }
}

async function openReportModal(id) {
  try {
    loading.value = true
    const report = await interviewApi.report({ id })
    reportDetail.totalScore = report.totalScore
    reportDetail.dimensionScoresJson = report.dimensionScoresJson || ''
    reportDetail.strengths = report.strengths || ''
    reportDetail.risks = report.risks || ''
    reportDetail.recommendation = report.recommendation || ''
    reportDetail.followUpQuestions = report.followUpQuestions || ''
    reportModal.value = true
  } catch (err) {
  } finally {
    loading.value = false
  }
}

async function openMessagesModal(id) {
  try {
    loading.value = true
    messageRecords.value = await interviewApi.messages({ sessionId: id })
    messagesModal.value = true
  } catch (err) {
  } finally {
    loading.value = false
  }
}

function showInviteInfo(interview) {
  rememberInterviewAccessCode(interview)
  inviteInfo.url = buildInviteUrl(interview)
  inviteInfo.accessCode = interview?.accessCode || ''
  inviteModal.value = true
}

function rememberInterviewAccessCode(interview) {
  if (interview?.id && interview?.accessCode) {
    interviewAccessCodes[interview.id] = interview.accessCode
  }
}

function buildInviteUrl(interview) {
  if (!interview?.inviteUrl) {
    return ''
  }
  return `${locationOrigin}${interview.inviteUrl}`
}

async function copyInviteInfo() {
  const text = `面试链接：${inviteInfo.url}\n面试口令：${inviteInfo.accessCode}`
  try {
    await navigator.clipboard.writeText(text)
    showSuccess('邀请信息已复制')
  } catch (err) {
    showError('复制失败，请重新点击按钮或检查浏览器复制权限')
  }
}

function candidateOptionLabel(candidate) {
  const job = jobOptions.value.find(item => String(item.id) === String(candidate.jobId))
  return job?.title ? `${candidate.name}（${job.title}）` : candidate.name
}

function onInterviewJobChange() {
  if (!interviewForm.candidateId) {
    return
  }
  const candidate = candidateOptions.value.find(item => String(item.id) === String(interviewForm.candidateId))
  if (candidate && String(candidate.jobId) !== String(interviewForm.jobId)) {
    interviewForm.candidateId = ''
  }
}

function onInterviewCandidateChange() {
  const candidate = candidateOptions.value.find(item => String(item.id) === String(interviewForm.candidateId))
  if (candidate?.jobId) {
    interviewForm.jobId = candidate.jobId
  }
}

function formatTime(value) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 19)
}

function formatDate(value) {
  return formatTime(value).slice(0, 10)
}

function formatClock(value) {
  const formatted = formatTime(value)
  if (formatted === '-') return '-'
  return formatted.slice(11, 19)
}

function statusText(status) {
  if (status === 'ENABLED') return '启用'
  if (status === 'DISABLED') return '停用'
  return status || '-'
}

function permissionTypeText(type) {
  if (type === 'MENU') return '菜单'
  if (type === 'BUTTON') return '按钮'
  if (type === 'API') return '接口'
  return type || '-'
}

function genderText(gender) {
  if (gender === 'MALE') return '男'
  if (gender === 'FEMALE') return '女'
  if (gender === 'UNKNOWN') return '未知'
  return '-'
}

function interviewStatusText(status) {
  const map = {
    INVITED: '已邀请',
    WAITING: '等待中',
    IN_PROGRESS: '面试中',
    COMPLETED: '已完成',
    FAILED: '失败',
    CANCELLED: '已取消',
    EXPIRED: '已过期'
  }
  return map[status] || status || '-'
}

function recommendationText(value) {
  if (value === 'RECOMMEND') return '推荐'
  if (value === 'HOLD') return '待定'
  if (value === 'REJECT') return '不推荐'
  return value || '-'
}

function parseJsonArray(value) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    return []
  }
}

function buildPermissionChildrenMap(list) {
  const source = [...(list || [])].sort((a, b) => {
    const sortResult = Number(a.sortNo || 0) - Number(b.sortNo || 0)
    if (sortResult !== 0) return sortResult
    return Number(a.id || 0) - Number(b.id || 0)
  })
  const childrenMap = new Map()
  source.forEach(item => {
    const parentId = Number(item.parentId || 0)
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, [])
    }
    childrenMap.get(parentId).push(item)
  })
  return childrenMap
}

function flattenPermissions(list, expandedIds = null, rootMenuOnly = false) {
  const childrenMap = buildPermissionChildrenMap(list)
  const expandedSet = expandedIds ? new Set(expandedIds.map(Number)) : null
  const result = []
  const visit = (parentId, level) => {
    ;(childrenMap.get(parentId) || []).forEach(item => {
      if (rootMenuOnly && Number(parentId) === 0 && item.type !== 'MENU') {
        return
      }
      const id = Number(item.id)
      const hasChildren = (childrenMap.get(id) || []).length > 0
      result.push({ ...item, level, hasChildren })
      if (!expandedSet || expandedSet.has(id)) {
        visit(id, level + 1)
      }
    })
  }
  visit(0, 0)
  return result
}
</script>
