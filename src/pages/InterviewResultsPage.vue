<template>
  <main class="hr-results-page">
    <header class="hr-results-header">
      <div>
        <small>奢享家 HR 管理系统</small>
        <h1>面试结果</h1>
      </div>
      <button @click="goDashboard">后台</button>
    </header>

    <section class="hr-results-filter">
      <input v-model.trim="query.keyword" placeholder="候选人 / 岗位" @keyup.enter="search" />
      <select v-model="query.recommendation" @change="search">
        <option value="">全部结果</option>
        <option value="RECOMMEND">推荐</option>
        <option value="HOLD">待定</option>
        <option value="REJECT">不推荐</option>
      </select>
      <button class="primary" :disabled="loading" @click="search">查询</button>
    </section>

    <section class="hr-results-summary">
      <b>共 {{ pagination.total }} 份报告</b>
      <span>第 {{ pagination.pageNo }} / {{ totalPages }} 页</span>
    </section>

    <section class="hr-results-list">
      <article v-for="item in reports" :key="item.reportId" class="hr-result-card">
        <div class="result-card-top">
          <div>
            <h2>{{ item.candidateName || '-' }}</h2>
            <p>{{ item.jobTitle || '-' }}</p>
          </div>
          <span :class="['result-badge', item.recommendation?.toLowerCase()]">
            {{ recommendationText(item.recommendation) }}
          </span>
        </div>
        <div class="result-card-score">
          <b>{{ item.totalScore ?? '-' }}</b>
          <span>综合评分</span>
        </div>
        <div class="result-card-meta">
          <span>结束：{{ formatTime(item.endedAt || item.reportCreatedAt) }}</span>
          <span>#{{ item.sessionId }}</span>
        </div>
        <button class="primary block-button" :disabled="loading" @click="openReport(item.sessionId)">查看报告</button>
      </article>
      <div v-if="!loading && reports.length === 0" class="hr-results-empty">暂无面试报告</div>
    </section>

    <div class="hr-results-pagination">
      <button :disabled="loading || pagination.pageNo <= 1" @click="changePage(pagination.pageNo - 1)">上一页</button>
      <button :disabled="loading || pagination.pageNo >= totalPages" @click="changePage(pagination.pageNo + 1)">下一页</button>
    </div>

    <div v-if="reportModal" class="report-sheet">
      <section class="report-sheet-panel">
        <div class="report-sheet-header">
          <div>
            <small>面试报告</small>
            <h2>{{ recommendationText(reportDetail.recommendation) }}</h2>
          </div>
          <button class="icon-button" @click="closeReport">×</button>
        </div>
        <div class="score-large">{{ reportDetail.totalScore ?? '-' }}</div>
        <div class="mobile-report-block">
          <h3>维度评分</h3>
          <div v-for="dimension in reportDimensions" :key="dimension.name" class="mobile-score-row">
            <span>{{ dimension.name }}</span>
            <b>{{ dimension.score }}</b>
            <small>{{ dimension.comment }}</small>
          </div>
          <p v-if="reportDimensions.length === 0">-</p>
        </div>
        <div class="mobile-report-block">
          <h3>优势</h3>
          <p>{{ reportDetail.strengths || '-' }}</p>
        </div>
        <div class="mobile-report-block">
          <h3>风险点</h3>
          <p>{{ reportDetail.risks || '-' }}</p>
        </div>
        <div class="mobile-report-block">
          <h3>建议追问</h3>
          <p v-for="question in reportQuestions" :key="question">{{ question }}</p>
          <p v-if="reportQuestions.length === 0">-</p>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { interviewApi } from '../api/hr'

const router = useRouter()
const loading = ref(false)
const reports = ref([])
const reportModal = ref(false)
const query = reactive({
  keyword: '',
  recommendation: ''
})
const pagination = reactive({
  pageNo: 1,
  pageSize: 10,
  total: 0
})
const reportDetail = reactive({
  totalScore: null,
  dimensionScoresJson: '',
  strengths: '',
  risks: '',
  recommendation: '',
  followUpQuestions: ''
})

const totalPages = computed(() => Math.max(1, Math.ceil(pagination.total / pagination.pageSize)))
const reportDimensions = computed(() => parseJsonArray(reportDetail.dimensionScoresJson))
const reportQuestions = computed(() => parseJsonArray(reportDetail.followUpQuestions))

onMounted(loadReports)

async function loadReports() {
  try {
    loading.value = true
    const page = await interviewApi.reports({
      pageNo: pagination.pageNo,
      pageSize: pagination.pageSize,
      keyword: query.keyword,
      recommendation: query.recommendation
    })
    reports.value = page.records || []
    pagination.total = Number(page.total || 0)
    pagination.pageNo = Number(page.pageNo || pagination.pageNo)
    pagination.pageSize = Number(page.pageSize || pagination.pageSize)
  } catch (err) {
  } finally {
    loading.value = false
  }
}

function search() {
  pagination.pageNo = 1
  loadReports()
}

function changePage(pageNo) {
  pagination.pageNo = pageNo
  loadReports()
}

async function openReport(sessionId) {
  try {
    loading.value = true
    const report = await interviewApi.report({ id: sessionId })
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

function closeReport() {
  reportModal.value = false
}

function goDashboard() {
  router.push('/')
}

function recommendationText(value) {
  if (value === 'RECOMMEND') return '推荐'
  if (value === 'HOLD') return '待定'
  if (value === 'REJECT') return '不推荐'
  return value || '-'
}

function formatTime(value) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 16)
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
</script>
