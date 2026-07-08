<template>
  <main :class="['interview-page', deviceClass]">
    <section class="interview-panel">
      <div class="interview-header">
        <div class="interview-brand-title">
          <img class="brand-logo" :src="brandLogo" alt="奢享家" />
          <span>奢享家 HR 面试间</span>
        </div>
        <button v-if="!showAccessInput && !isEntered && !isCompleted" class="primary interview-start-button" :disabled="startingInterview" @click="startInterview">
          {{ primaryStartText }}
        </button>
      </div>

      <div v-if="invalidLink" class="interview-invalid-panel">
        <b>面试链接不可用</b>
        <span>{{ invalidLinkMessage }}</span>
      </div>

      <div v-else class="interview-workspace">
        <section class="interview-side-panel">
          <div class="interview-meta-grid">
            <div class="interview-info-card">
              <small>面试岗位 / 面试人</small>
              <b>{{ interview?.jobTitle || '-' }}</b>
              <b>{{ interview?.candidateName || '-' }}</b>
            </div>
            <div class="interview-status-card">
              <small>面试状态</small>
              <b>{{ interviewStatusText }}</b>
            </div>
            <div class="realtime-status-card" :class="realtimeStatusClass">
              <small>实时语音</small>
              <b><i></i>{{ realtimeStatusText }}</b>
            </div>
          </div>

          <div v-if="showAccessInput" class="access-panel">
            <div class="access-panel-title">
              <b>输入面试口令</b>
            </div>
            <div class="access-inline">
              <label class="access-code-field">
                <input
                  v-model="accessCode"
                  type="tel"
                  maxlength="6"
                  autocomplete="one-time-code"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  placeholder="请输入口令"
                  @keyup.enter="enterInterview"
                />
              </label>
              <button class="primary access-submit" :disabled="!normalizedAccessCode || isCompleted || startingInterview" @click="startInterview">
                {{ primaryStartText }}
              </button>
            </div>
          </div>
        </section>

        <section class="interview-main-panel">
          <div class="conversation">
            <div class="conversation-title">
              <b>面试对话</b>
            </div>
            <div v-if="realtimeFatalError" class="interview-service-alert">
              <b>实时语音暂时不可用</b>
              <span>{{ realtimeFatalError }}</span>
            </div>
            <div v-if="interviewClosedByAdmin" class="interview-service-alert is-closed">
              <b>面试已由后台关闭</b>
              <span>{{ adminClosedMessage }}</span>
            </div>
            <div v-if="interviewAutoFinished" class="interview-service-alert is-finished">
              <b>面试已自动结束</b>
              <span>{{ autoFinishedMessage }}</span>
            </div>
            <div ref="conversationMessagesRef" class="conversation-messages" @scroll="handleConversationScroll">
              <div v-if="!realtimeMessages.length" class="bubble ai">
                <span class="bubble-content">你好，我是本次 AI 面试官。进入面试后，我会根据岗位和简历进行提问。</span>
              </div>
              <div v-for="message in realtimeMessages" :key="message.id" :class="['bubble', message.role]">
                <span class="bubble-time">{{ formatMessageTime(message.createdAt) }}</span>
                <span class="bubble-content">{{ message.content }}</span>
              </div>
            </div>
          </div>

          <form v-if="canOperateInterview" class="interview-say-form" @submit.prevent="sendTextQuery">
            <input v-model.trim="textQuery" placeholder="也可以输入文字补充回答" />
            <button class="primary" type="submit" :disabled="!textQuery || realtimeStatus !== 'connected' || Boolean(realtimeFatalError)">发送</button>
          </form>

          <div v-if="canOperateInterview || interviewClosedByAdmin" class="interview-actions">
            <button class="ghost" @click="reload">刷新</button>
            <button v-if="showReconnectButton" class="secondary" :disabled="!isEntered || isCompleted || realtimeConnecting" @click="connectRealtime">
              {{ realtimeButtonText }}
            </button>
            <button v-if="canOperateInterview" class="danger" :disabled="!isEntered || isCompleted || finishingInterview" @click="finishInterview">
              {{ finishingInterview ? '结束中' : '结束面试' }}
            </button>
          </div>
        </section>
      </div>
      <audio ref="remoteAudio" autoplay></audio>
    </section>
    <div v-if="isQueueing && !interviewClosedByAdmin" class="interview-queue-mask">
      <section class="interview-queue-modal">
        <div class="queue-spinner" aria-hidden="true"></div>
        <h2>实时语音正在排队</h2>
        <p>当前同时面试人数较多，系统会每 5 秒自动尝试连接一次。请保持页面打开，不需要重复刷新。</p>
        <span>{{ queueRetryText }}</span>
        <button type="button" :disabled="finishingInterview" @click="finishInterview">
          {{ finishingInterview ? '结束中' : '结束面试' }}
        </button>
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { publicInterviewApi } from '../api/hr'
import { showError, showSuccess } from '../utils/message'
import brandLogo from '../assets/shexiangjia-logo.png'

const route = useRoute()
const token = Array.isArray(route.params.token) ? route.params.token[0] : route.params.token
const interview = ref(null)
const accessCode = ref('')
const remoteAudio = ref(null)
const conversationMessagesRef = ref(null)
const realtimeSocket = ref(null)
const realtimeStatus = ref('idle')
const realtimeConnecting = ref(false)
const realtimeMessages = ref([])
const textQuery = ref('')
const localStream = ref(null)
const audioContext = ref(null)
const mediaSource = ref(null)
const audioProcessor = ref(null)
const nextPlayTime = ref(0)
const activeAudioSources = new Set()
const micUploadPausedUntil = ref(0)
const micUploadResumeTimer = ref(null)
const audioUnlocked = ref(false)
const currentUserMessageId = ref(null)
const currentAiMessageId = ref(null)
const hasAiChatResponseInTurn = ref(false)
const realtimeHeartbeatTimer = ref(null)
const realtimeReconnectTimer = ref(null)
const historySyncTimers = ref([])
const queueCountdownTimer = ref(null)
const queueRetrySeconds = ref(0)
const realtimeReconnectAttempts = ref(0)
const reconnectingAutomatically = ref(false)
const isQueueing = ref(false)
const manualRealtimeClosing = ref(false)
const lastRealtimeError = ref('')
const realtimeFatalError = ref('')
const interviewClosedByAdmin = ref(false)
const adminClosedMessage = ref('后台已强制关闭面试，当前页面不再继续连接实时语音。如需继续，请联系 HR。')
const interviewAutoFinished = ref(false)
const autoFinishedMessage = ref('本轮面试已结束，系统正在生成面试报告，后续结果将由 HR 通知。')
const conversationAutoScroll = ref(true)
const realtimeConnectionSeq = ref(0)
const realtimeQuestionLimitReached = ref(false)
const MAX_REALTIME_RECONNECTS = 3
const REALTIME_RECONNECT_DELAY = 2000
const REALTIME_QUEUE_RETRY_DELAY = 5000
const accessCodeStorageKey = `interview-access-code:${token}`
const enteringInterview = ref(false)
const finishingInterview = ref(false)
const deviceClass = ref('is-desktop-device')
const accessVerified = ref(false)
const invalidLink = ref(false)
const invalidLinkMessage = ref('面试链接不存在或已失效，请联系 HR 重新发送邀请链接。')

const isEntered = computed(() => interview.value?.status === 'IN_PROGRESS')
const isCompleted = computed(() => ['GENERATING', 'COMPLETED', 'FAILED'].includes(interview.value?.status))
const startingInterview = computed(() => enteringInterview.value || realtimeConnecting.value)
const normalizedAccessCode = computed(() => accessCode.value.trim())
const canOperateInterview = computed(() => accessVerified.value && isEntered.value && !isCompleted.value && !finishingInterview.value && !interviewClosedByAdmin.value && !interviewAutoFinished.value)
const showAccessInput = computed(() => !interviewClosedByAdmin.value && !interviewAutoFinished.value && !finishingInterview.value && !isCompleted.value && !canOperateInterview.value)
const showReconnectButton = computed(() => canOperateInterview.value && !realtimeFatalError.value && !realtimeQuestionLimitReached.value && ['idle', 'disconnected', 'failed', 'queueing'].includes(realtimeStatus.value))
const realtimeStatusClass = computed(() => realtimeStatus.value === 'connected' ? 'is-connected' : 'is-disconnected')
const interviewStatusText = computed(() => {
  if (interviewClosedByAdmin.value) return '已关闭'
  if (interviewAutoFinished.value) return '已结束'
  if (isCompleted.value) return '已完成'
  if (finishingInterview.value) return '结束中'
  if (canOperateInterview.value) return '面试中'
  if (showAccessInput.value) return '待开始'
  return '等待中'
})
const primaryStartText = computed(() => {
  if (enteringInterview.value) return '进入中'
  if (realtimeConnecting.value) return '连接语音中'
  return '开始面试'
})
const realtimeStatusText = computed(() => {
  if (interviewClosedByAdmin.value) return '已关闭'
  if (interviewAutoFinished.value) return '已结束'
  if (isCompleted.value) return '已结束'
  const map = {
    idle: '未连接',
    connecting: '连接中',
    connected: '已连接',
    disconnected: '已断开',
    failed: '连接失败',
    queueing: '排队中'
  }
  return map[realtimeStatus.value] || '未连接'
})
const realtimeButtonText = computed(() => {
  if (realtimeStatus.value === 'connected') return '重新连接语音'
  if (isQueueing.value) return '继续排队'
  return '重新连接语音'
})
const queueRetryText = computed(() => queueRetrySeconds.value > 0
  ? `${queueRetrySeconds.value} 秒后自动重试`
  : '正在尝试连接')
onMounted(async () => {
  detectDevice()
  window.addEventListener('resize', detectDevice)
  if (!token) {
    markInvalidLink('面试链接缺少邀请信息，请联系 HR 重新发送邀请链接。')
    return
  }
  accessCode.value = window.sessionStorage.getItem(accessCodeStorageKey) || ''
  accessVerified.value = Boolean(accessCode.value)
  await reload()
  if (invalidLink.value) {
    return
  }
  if (accessVerified.value && isEntered.value && normalizedAccessCode.value) {
    await loadHistoryMessages()
    await connectRealtime(true)
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', detectDevice)
  clearRealtimeReconnectTimer()
  clearHistorySyncTimers()
  clearQueueCountdownTimer()
  disconnectRealtime()
})

watch(accessCode, value => {
  const normalized = String(value || '').replace(/\D/g, '').slice(0, 6)
  if (normalized !== value) {
    accessCode.value = normalized
    return
  }
})

watch(() => realtimeMessages.value.length, () => {
  scrollConversationToBottom()
})

async function reload() {
  if (!token || invalidLink.value) {
    return
  }
  try {
    const wasInProgress = isEntered.value
    interview.value = await publicInterviewApi.detail({ token }, { skipErrorMessage: true })
    if (!finishingInterview.value && accessVerified.value && wasInProgress && !isEntered.value) {
      markInterviewClosedByAdmin()
      return
    }
    if (accessVerified.value && isEntered.value && normalizedAccessCode.value) {
      await loadHistoryMessages()
    }
  } catch (err) {
    if (err?.code === 404001) {
      markInvalidLink(err.message || '面试链接不存在或已失效，请联系 HR 重新发送邀请链接。')
    }
  }
}

function markInvalidLink(message = '') {
  invalidLinkMessage.value = normalizeMessageText(message) || '面试链接不存在或已失效，请联系 HR 重新发送邀请链接。'
  invalidLink.value = true
  accessVerified.value = false
  interview.value = null
  window.sessionStorage.removeItem(accessCodeStorageKey)
  stopRealtimeUiAfterTerminalEvent()
}

async function enterInterview() {
  const code = normalizedAccessCode.value
  if (!code) {
    showError('请输入面试口令')
    return
  }
  if (enteringInterview.value) {
    return
  }
  enteringInterview.value = true
  try {
    await unlockMobileAudio()
    interview.value = await publicInterviewApi.enter({ token, accessCode: code })
    accessVerified.value = true
    accessCode.value = code
    window.sessionStorage.setItem(accessCodeStorageKey, code)
    await loadHistoryMessages()
    showSuccess('已进入面试')
  } catch (err) {
  } finally {
    enteringInterview.value = false
  }
}

async function startInterview() {
  if (startingInterview.value) {
    return
  }
  if (interviewClosedByAdmin.value) {
    showError(adminClosedMessage.value)
    return
  }
  await enterInterview()
  if (canOperateInterview.value && realtimeStatus.value !== 'connected') {
    await connectRealtime()
  }
}

async function finishInterview() {
  if (finishingInterview.value) {
    return
  }
  const code = normalizedAccessCode.value
  if (!code) {
    showError('请输入面试口令')
    return
  }
  let finished = false
  finishingInterview.value = true
  try {
    disconnectRealtime()
    await loadHistoryMessages()
    interview.value = await publicInterviewApi.finish({ token, accessCode: code })
    finished = true
    accessVerified.value = false
    window.sessionStorage.removeItem(accessCodeStorageKey)
    showSuccess('面试已结束')
  } catch (err) {
  } finally {
    if (!finished) {
      finishingInterview.value = false
    }
  }
}

async function loadHistoryMessages() {
  if (interviewClosedByAdmin.value) return
  const code = normalizedAccessCode.value
  if (!code) return
  try {
    const messages = await publicInterviewApi.messages({ token, accessCode: code })
    mergeHistoryMessages(messages)
  } catch (err) {
    await handleMaybeClosedByAdmin(err)
  }
}

function syncHistoryMessages() {
  if (interviewClosedByAdmin.value) {
    return
  }
  clearHistorySyncTimers()
  loadHistoryMessages()
  if (isQueueing.value || realtimeStatus.value === 'queueing') {
    return
  }
  ;[800, 2000].forEach(delay => {
    const timer = window.setTimeout(() => {
      loadHistoryMessages()
    }, delay)
    historySyncTimers.value.push(timer)
  })
}

function clearHistorySyncTimers() {
  historySyncTimers.value.forEach(timer => window.clearTimeout(timer))
  historySyncTimers.value = []
}

function mergeHistoryMessages(messages) {
  if (!Array.isArray(messages)) {
    return
  }
  const historyMessages = messages
    .filter(item => item?.content)
    .map(toRealtimeHistoryMessage)
  if (!historyMessages.length) {
    return
  }
  const merged = []
  const seenIds = new Set()
  const seenContent = new Set()
  ;[...historyMessages, ...realtimeMessages.value].forEach(message => {
    if (!message?.content) {
      return
    }
    if (shouldSkipHistoryMessage(message)) {
      return
    }
    const stableId = message.id ? String(message.id) : ''
    const contentKey = getHistoryContentKey(message)
    const isHistoryMessage = stableId.startsWith('history-')
    if (seenContent.has(contentKey) || (isHistoryMessage && seenIds.has(stableId))) {
      return
    }
    if (isHistoryMessage) {
      seenIds.add(stableId)
    }
    seenContent.add(contentKey)
    merged.push(message)
  })
  realtimeMessages.value = merged
  realtimeQuestionLimitReached.value = merged.some(message => message.role === 'ai' && message.content?.includes('本轮问题已经了解得差不多'))
  scrollConversationToBottom()
}

function toRealtimeHistoryMessage(item) {
  return {
    id: `history-${item.id || item.sequenceNo}`,
    role: item.role === 'CANDIDATE' ? 'user' : 'ai',
    content: normalizeMessageText(item.content),
    sequenceNo: item.sequenceNo || 0,
    createdAt: item.createdAt || ''
  }
}

async function connectRealtime(autoReconnect = false) {
  if (interviewClosedByAdmin.value) {
    return
  }
  if (autoReconnect && realtimeFatalError.value) {
    return
  }
  if (!isEntered.value) {
    showError('请先进入面试')
    return
  }
  const code = normalizedAccessCode.value
  if (!code) {
    showError('请输入面试口令')
    return
  }
  if (!autoReconnect) {
    realtimeReconnectAttempts.value = 0
    reconnectingAutomatically.value = false
    isQueueing.value = false
    realtimeFatalError.value = ''
    clearQueueCountdownTimer()
  }
  if (!autoReconnect && !isQueueing.value) {
    await loadHistoryMessages()
  }
  clearRealtimeReconnectTimer()
  await unlockMobileAudio()
  const wasQueueing = isQueueing.value || realtimeStatus.value === 'queueing'
  disconnectRealtime(!wasQueueing, false)
  lastRealtimeError.value = ''
  manualRealtimeClosing.value = false
  realtimeConnecting.value = true
  realtimeStatus.value = wasQueueing ? 'queueing' : 'connecting'
  const connectionSeq = realtimeConnectionSeq.value + 1
  realtimeConnectionSeq.value = connectionSeq
  let microphoneReady = false
  try {
    await prepareMicrophoneCapture()
    microphoneReady = true
    const result = await publicInterviewApi.connectRealtime({
      token,
      accessCode: code
    })
    const socket = new WebSocket(buildRealtimeWsUrl(result.websocketUrl, result.ticket))
    socket.binaryType = 'arraybuffer'
    realtimeSocket.value = socket
    socket.onopen = () => {
      if (connectionSeq !== realtimeConnectionSeq.value) return
      realtimeStatus.value = 'connected'
      reconnectingAutomatically.value = false
      isQueueing.value = false
      clearQueueCountdownTimer()
      realtimeReconnectAttempts.value = 0
      syncHistoryMessages()
      showSuccess(autoReconnect ? '实时语音已恢复' : '实时语音已连接')
      startRealtimeHeartbeat()
      bindMicrophoneToRealtimeSocket()
    }
    socket.onmessage = event => {
      if (connectionSeq !== realtimeConnectionSeq.value) return
      handleRealtimeMessage(event)
    }
    socket.onerror = () => {
      if (connectionSeq !== realtimeConnectionSeq.value) return
      realtimeStatus.value = 'failed'
      lastRealtimeError.value = '实时语音连接异常，请检查网络后重新连接。'
    }
    socket.onclose = event => {
      if (connectionSeq !== realtimeConnectionSeq.value) return
      stopRealtimeHeartbeat()
      stopMicrophoneCapture()
      realtimeSocket.value = null
      if (manualRealtimeClosing.value) {
        manualRealtimeClosing.value = false
        return
      }
      if (isQueueing.value || realtimeStatus.value === 'queueing') {
        return
      }
      if (event.reason?.includes('同一面试已在新页面连接')) {
        realtimeStatus.value = 'disconnected'
        reconnectingAutomatically.value = false
        lastRealtimeError.value = '实时语音已在另一个页面连接，本页面已停止语音连接。'
        showError(lastRealtimeError.value)
        syncHistoryMessages()
        return
      }
      if (isAdminCloseReason(event.reason)) {
        markInterviewClosedByAdmin(event.reason)
        return
      }
      if (isAutoFinishReason(event.reason)) {
        markInterviewAutoFinished()
        return
      }
      if (realtimeStatus.value !== 'failed') {
        realtimeStatus.value = 'disconnected'
      }
      const reason = event.reason ? `，原因：${event.reason}` : ''
      lastRealtimeError.value = `实时语音已断开，请点击重新连接。关闭码：${event.code}${reason}`
      if (!isQueueing.value && realtimeStatus.value !== 'queueing') {
        syncHistoryMessages()
      }
      scheduleRealtimeReconnect()
    }
  } catch (err) {
    if (connectionSeq !== realtimeConnectionSeq.value) return
    if (await handleMaybeClosedByAdmin(err)) {
      return
    }
    if (err?.code === 429001) {
      handleRealtimeQueueing()
      return
    }
    realtimeStatus.value = 'failed'
    lastRealtimeError.value = microphoneReady ? '实时语音连接失败，请检查网络后重新连接' : getMicrophoneErrorMessage(err)
    if (!autoReconnect) {
      showError(lastRealtimeError.value)
    }
    disconnectRealtime(false)
    if (microphoneReady) {
      scheduleRealtimeReconnect()
    }
  } finally {
    if (connectionSeq === realtimeConnectionSeq.value) {
      realtimeConnecting.value = false
    }
  }
}

function disconnectRealtime(resetStatus = true, sendFinish = true) {
  clearRealtimeReconnectTimer()
  stopRealtimeHeartbeat()
  resumeMicrophoneUpload()
  stopMicrophoneCapture()
  clearQueuedRealtimeAudio()
  currentUserMessageId.value = null
  currentAiMessageId.value = null
  if (realtimeSocket.value) {
    manualRealtimeClosing.value = true
    if (sendFinish && realtimeSocket.value.readyState === WebSocket.OPEN) {
      realtimeSocket.value.send('finish')
    }
    realtimeSocket.value.close()
    realtimeSocket.value = null
  }
  if (remoteAudio.value) {
    remoteAudio.value.srcObject = null
    remoteAudio.value.removeAttribute('src')
  }
  if (resetStatus) {
    realtimeStatus.value = 'idle'
    isQueueing.value = false
    clearQueueCountdownTimer()
    lastRealtimeError.value = ''
  }
}

function handleRealtimeQueueing() {
  if (interviewClosedByAdmin.value) {
    return
  }
  isQueueing.value = true
  reconnectingAutomatically.value = true
  realtimeStatus.value = 'queueing'
  realtimeConnecting.value = false
  lastRealtimeError.value = '实时语音正在排队，请保持页面打开，系统会自动重试连接。'
  stopMicrophoneCapture()
  clearHistorySyncTimers()
  scheduleRealtimeReconnect(REALTIME_QUEUE_RETRY_DELAY, true)
}

function scheduleRealtimeReconnect(delay = REALTIME_RECONNECT_DELAY, queueing = false) {
  if (interviewClosedByAdmin.value || !isEntered.value || isCompleted.value || !normalizedAccessCode.value || manualRealtimeClosing.value || realtimeFatalError.value) {
    return
  }
  if (!queueing && realtimeReconnectAttempts.value >= MAX_REALTIME_RECONNECTS) {
    reconnectingAutomatically.value = false
    lastRealtimeError.value = '实时语音已断开，自动重连失败，请点击“重新连接语音”继续。'
    showError(lastRealtimeError.value)
    return
  }
  clearRealtimeReconnectTimer()
  if (!queueing) {
    realtimeReconnectAttempts.value += 1
  }
  reconnectingAutomatically.value = true
  realtimeStatus.value = queueing ? 'queueing' : 'connecting'
  lastRealtimeError.value = queueing
    ? '实时语音正在排队，请保持页面打开，系统会自动重试连接。'
    : `实时语音断开，正在第 ${realtimeReconnectAttempts.value} 次自动重连。`
  if (queueing) {
    startQueueCountdown(delay)
  }
  realtimeReconnectTimer.value = window.setTimeout(() => {
    clearQueueCountdownTimer()
    connectRealtime(true)
  }, delay)
}

function clearRealtimeReconnectTimer() {
  if (realtimeReconnectTimer.value) {
    window.clearTimeout(realtimeReconnectTimer.value)
    realtimeReconnectTimer.value = null
  }
}

function startQueueCountdown(delay) {
  clearQueueCountdownTimer()
  queueRetrySeconds.value = Math.max(1, Math.ceil(delay / 1000))
  queueCountdownTimer.value = window.setInterval(() => {
    queueRetrySeconds.value = Math.max(0, queueRetrySeconds.value - 1)
  }, 1000)
}

function clearQueueCountdownTimer() {
  if (queueCountdownTimer.value) {
    window.clearInterval(queueCountdownTimer.value)
    queueCountdownTimer.value = null
  }
  queueRetrySeconds.value = 0
}

function startRealtimeHeartbeat() {
  stopRealtimeHeartbeat()
  realtimeHeartbeatTimer.value = window.setInterval(() => {
    if (realtimeSocket.value?.readyState === WebSocket.OPEN) {
      realtimeSocket.value.send('__ping')
    }
  }, 15000)
}

function stopRealtimeHeartbeat() {
  if (realtimeHeartbeatTimer.value) {
    window.clearInterval(realtimeHeartbeatTimer.value)
    realtimeHeartbeatTimer.value = null
  }
}

async function prepareMicrophoneCapture() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('MICROPHONE_UNSUPPORTED')
  }
  audioContext.value = audioContext.value || createAudioContext()
  await audioContext.value.resume()
  localStream.value = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  })
  mediaSource.value = audioContext.value.createMediaStreamSource(localStream.value)
  audioProcessor.value = audioContext.value.createScriptProcessor(4096, 1, 1)
  audioProcessor.value.connect(audioContext.value.destination)
}

function bindMicrophoneToRealtimeSocket() {
  if (!audioProcessor.value || !mediaSource.value) {
    return
  }
  audioProcessor.value.onaudioprocess = event => {
    if (realtimeSocket.value?.readyState !== WebSocket.OPEN) return
    const input = event.inputBuffer.getChannelData(0)
    const pcm = isMicrophoneUploadPaused()
      ? createSilencePcm(input.length, audioContext.value.sampleRate)
      : encodePcm16(resampleTo16k(input, audioContext.value.sampleRate))
    if (pcm.byteLength > 0) {
      realtimeSocket.value.send(`audio:${arrayBufferToBase64(pcm)}`)
    }
  }
  mediaSource.value.connect(audioProcessor.value)
}

function stopMicrophoneCapture() {
  resumeMicrophoneUpload()
  if (audioProcessor.value) {
    audioProcessor.value.disconnect()
    audioProcessor.value.onaudioprocess = null
    audioProcessor.value = null
  }
  if (mediaSource.value) {
    mediaSource.value.disconnect()
    mediaSource.value = null
  }
  if (localStream.value) {
    localStream.value.getTracks().forEach(track => track.stop())
    localStream.value = null
  }
}

function sendTextQuery() {
  if (!textQuery.value || realtimeSocket.value?.readyState !== WebSocket.OPEN) {
    return
  }
  resetAiTurn()
  realtimeSocket.value.send(textQuery.value)
  appendOrUpdateMessage('user', textQuery.value, true)
  textQuery.value = ''
}

function handleRealtimeMessage(event) {
  if (typeof event.data === 'string') {
    if (event.data.startsWith('audio:')) {
      playRealtimeAudio(base64ToArrayBuffer(event.data.slice(6)))
      return
    }
    appendRealtimeText(event.data)
    return
  }
  playRealtimeAudio(event.data)
}

function appendRealtimeText(text) {
  try {
    const payload = JSON.parse(text)
    const raw = payload.payload ? JSON.parse(payload.payload) : payload
    const content = extractRealtimeContent(payload.event, raw, payload.message)
    if (payload.event === 'error' || payload.event === 'dialog_error' || payload.event === 'quota_exceeded') {
      if (isQuotaRealtimeError(content, raw, payload)) {
        handleRealtimeFatalError('AI 实时语音额度已用完，当前无法继续自动连接。请联系 HR 处理后再继续面试。')
        return
      }
      if (payload.code === 429001 || raw?.code === 429001) {
        handleRealtimeQueueing()
        return
      }
      if (isIdleTimeoutRealtimeError(content, raw, payload)) {
        resumeMicrophoneUpload()
        realtimeStatus.value = 'disconnected'
        lastRealtimeError.value = '实时语音长时间没有检测到声音，正在重新连接。重新连接后请直接开始回答。'
        scheduleRealtimeReconnect(1000)
        return
      }
      realtimeStatus.value = 'failed'
      lastRealtimeError.value = friendlyRealtimeError(content, raw)
      showError(lastRealtimeError.value)
      return
    }
    if (payload.event === 'disconnected') {
      realtimeStatus.value = 'disconnected'
      lastRealtimeError.value = content || '实时语音已断开，请点击重新连接。'
      return
    }
    if (payload.event === 'interview_question_limit_reached') {
      realtimeQuestionLimitReached.value = true
      realtimeStatus.value = 'disconnected'
      lastRealtimeError.value = ''
      appendAiMessage(content || '本轮问题已经了解得差不多了，回答完成后请点击结束面试。')
      stopRealtimeHeartbeat()
      resumeMicrophoneUpload()
      stopMicrophoneCapture()
      return
    }
    if (payload.event === 'audio_clear') {
      clearQueuedRealtimeAudio()
      return
    }
    if (payload.event === 'interview_auto_finished') {
      markInterviewAutoFinished(content || payload.message)
      return
    }
    if (payload.event === 'interview_closed_by_admin') {
      markInterviewClosedByAdmin(content || payload.message)
      return
    }
    handleRealtimeTextEvent(payload.event, raw, content)
  } catch (err) {
    showError(friendlyRealtimeError(text))
  }
}

function handleRealtimeTextEvent(event, raw, content) {
  if (event === 'asr_response') {
    const finalText = extractFinalAsrText(raw)
    const interimText = extractInterimAsrText(raw)
    if (finalText) {
      resetAiTurn()
      appendOrUpdateMessage('user', finalText, true)
      return
    }
    if (interimText) {
      resetAiTurn()
      appendOrUpdateMessage('user', interimText, false)
    }
    return
  }
  if (event === 'tts_sentence_end' || event === 'tts_ended' || event === 'chat_ended') {
    scheduleMicrophoneUploadResume(300)
    return
  }
  if (!content) return
  if (event === 'chat_response') {
    pauseMicrophoneUpload(800)
    if (raw?.newMessage) {
      resetAiTurn()
    }
    hasAiChatResponseInTurn.value = true
    appendAiMessage(content)
    return
  }
  if (event === 'tts_sentence_start') {
    pauseMicrophoneUpload(1200)
    if (!hasAiChatResponseInTurn.value) {
      appendAiMessage(content)
    }
    return
  }
}

function resetAiTurn() {
  currentAiMessageId.value = null
  hasAiChatResponseInTurn.value = false
}

function appendAiMessage(content) {
  const normalized = normalizeMessageText(content)
  if (!normalized) return
  const existing = currentAiMessageId.value
    ? realtimeMessages.value.find(item => item.id === currentAiMessageId.value)
    : null
  if (existing) {
    existing.content = mergeMessageText(existing.content, normalized)
    scrollConversationToBottom()
    return
  }
  const id = Date.now() + Math.random()
  realtimeMessages.value.push({ id, role: 'ai', content: normalized, createdAt: new Date().toISOString() })
  currentAiMessageId.value = id
  scrollConversationToBottom(true)
}

function appendOrUpdateMessage(role, content, finalMessage) {
  const normalized = normalizeMessageText(content)
  if (!normalized) return
  const idRef = role === 'user' ? currentUserMessageId : currentAiMessageId
  const existing = idRef.value ? realtimeMessages.value.find(item => item.id === idRef.value) : null
  if (existing) {
    existing.content = normalized
  } else {
    const id = Date.now() + Math.random()
    realtimeMessages.value.push({ id, role, content: normalized, createdAt: new Date().toISOString() })
    idRef.value = id
  }
  scrollConversationToBottom(!existing)
  if (finalMessage) {
    idRef.value = null
  }
}

function handleConversationScroll() {
  const el = conversationMessagesRef.value
  if (!el) return
  const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight
  conversationAutoScroll.value = distanceToBottom < 96
}

function scrollConversationToBottom(force = false) {
  if (!force && !conversationAutoScroll.value) {
    return
  }
  nextTick(() => {
    const el = conversationMessagesRef.value
    if (!el) return
    el.scrollTop = el.scrollHeight
  })
}

function mergeMessageText(current, incoming) {
  const base = normalizeMessageText(current)
  const next = normalizeMessageText(incoming)
  if (!base) return next
  if (!next || base === next || base.endsWith(next)) return base
  if (next.startsWith(base)) return next
  return `${base}${needsSpaceBetween(base, next) ? ' ' : ''}${next}`
}

function normalizeMessageText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim()
}

function getHistoryContentKey(message) {
  const role = message.role
  const text = normalizeMessageText(message.content)
  if (role === 'ai' && isOpeningAiMessage(text)) {
    return `${role}:opening`
  }
  return `${role}:${text}`
}

function shouldSkipHistoryMessage(message) {
  const text = normalizeMessageText(message.content)
  return message.role === 'ai' && text.includes('我们继续刚才的面试')
}

function isOpeningAiMessage(text) {
  if (text.includes('你好，我是本次 AI 面试官') && text.includes('请先用一分钟')) {
    return true
  }
  return text.includes('自我介绍')
    && (text.includes('一分钟') || text.includes('初步了解'))
    && (text.includes('你好') || text.includes('您好'))
}

function friendlyRealtimeError(content, raw = null) {
  const rawText = normalizeMessageText(content || raw?.error || raw?.message || '')
  if (rawText.includes('52000042') || rawText.includes('DialogAudioIdleTimeoutError')) {
    return '实时语音长时间没有检测到声音，请点击重新连接语音后直接开始回答。'
  }
  if (rawText.includes('Service temporarily unavailable')) {
    return 'AI 服务暂时不可用，请稍后重新连接语音。'
  }
  if (rawText.startsWith('{') && rawText.endsWith('}')) {
    return '实时语音连接异常，请重新连接语音。'
  }
  return rawText || '实时语音连接异常，请重新连接语音。'
}

function isQuotaRealtimeError(content, raw = null, payload = null) {
  const rawText = normalizeMessageText([
    content,
    raw?.error,
    raw?.message,
    raw?.msg,
    raw?.code,
    payload?.message,
    payload?.code
  ].filter(Boolean).join(' '))
  return /quota|insufficient[_ ]?quota|quota exceeded|balance|余额不足|额度不足|额度已用完|配额不足|超出配额|tokens_lifetime/i.test(rawText)
}

function isIdleTimeoutRealtimeError(content, raw = null, payload = null) {
  const rawText = normalizeMessageText([
    content,
    raw?.error,
    raw?.message,
    raw?.msg,
    raw?.code,
    payload?.message,
    payload?.code
  ].filter(Boolean).join(' '))
  return rawText.includes('52000042') || rawText.includes('DialogAudioIdleTimeoutError')
}

function handleRealtimeFatalError(message) {
  clearRealtimeReconnectTimer()
  clearQueueCountdownTimer()
  stopRealtimeHeartbeat()
  resumeMicrophoneUpload()
  stopMicrophoneCapture()
  reconnectingAutomatically.value = false
  isQueueing.value = false
  realtimeConnecting.value = false
  realtimeStatus.value = 'failed'
  realtimeFatalError.value = message
  lastRealtimeError.value = message
  showError(message)
  disconnectRealtime(false, false)
}

function markInterviewClosedByAdmin(message = '') {
  adminClosedMessage.value = normalizeMessageText(message) || '后台已强制关闭面试，当前页面不再继续连接实时语音。如需继续，请联系 HR。'
  interviewClosedByAdmin.value = true
  stopRealtimeUiAfterTerminalEvent()
}

function markInterviewAutoFinished(message = '') {
  autoFinishedMessage.value = normalizeMessageText(message) || '本轮面试已结束，系统正在生成面试报告，后续结果将由 HR 通知。'
  interviewAutoFinished.value = true
  realtimeQuestionLimitReached.value = true
  if (interview.value) {
    interview.value = { ...interview.value, status: 'GENERATING' }
  }
  stopRealtimeUiAfterTerminalEvent()
}

function stopRealtimeUiAfterTerminalEvent() {
  clearRealtimeReconnectTimer()
  clearQueueCountdownTimer()
  clearHistorySyncTimers()
  stopRealtimeHeartbeat()
  resumeMicrophoneUpload()
  stopMicrophoneCapture()
  reconnectingAutomatically.value = false
  isQueueing.value = false
  realtimeConnecting.value = false
  realtimeStatus.value = 'disconnected'
  lastRealtimeError.value = ''
  realtimeFatalError.value = ''
  disconnectRealtime(false, false)
}

async function handleMaybeClosedByAdmin(err) {
  if (err?.code !== 409001 && !isAdminCloseReason(err?.message)) {
    return false
  }
  try {
    interview.value = await publicInterviewApi.detail({ token })
  } catch (detailErr) {
  }
  if (!isEntered.value || isCompleted.value) {
    markInterviewClosedByAdmin('后台已强制关闭面试，当前页面不再继续连接实时语音。如需继续，请联系 HR。')
    return true
  }
  return false
}

function isAdminCloseReason(reason = '') {
  const text = normalizeMessageText(reason)
  return text.includes('后台结束') || text.includes('后台关闭') || text.includes('后台已关闭') || text.includes('面试已由后台')
}

function isAutoFinishReason(reason = '') {
  const text = normalizeMessageText(reason)
  return text.includes('自动结束') || text.includes('面试已自动结束')
}

function detectDevice() {
  const userAgent = navigator.userAgent || ''
  const platform = navigator.platform || ''
  const touchPoints = navigator.maxTouchPoints || 0
  const isIpadLike = platform === 'MacIntel' && touchPoints > 1
  const isMobileOrTabletAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(userAgent)
  const hasCoarsePointer = Boolean(window.matchMedia?.('(pointer: coarse)')?.matches)
  const isSmallScreen = window.innerWidth <= 820
  deviceClass.value = (isMobileOrTabletAgent || isIpadLike || (hasCoarsePointer && isSmallScreen))
    ? 'is-touch-device'
    : 'is-desktop-device'
}

function formatMessageTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value).replace('T', ' ').slice(11, 16)
  }
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function needsSpaceBetween(left, right) {
  return /[A-Za-z0-9]$/.test(left) && /^[A-Za-z0-9]/.test(right)
}

async function unlockMobileAudio() {
  try {
    audioContext.value = audioContext.value || createAudioContext()
    const context = audioContext.value
    const source = context.createBufferSource()
    source.buffer = context.createBuffer(1, 1, 24000)
    source.connect(context.destination)
    source.start(0)
    if (context.state === 'suspended') {
      await promiseWithTimeout(context.resume(), 800)
    }
    audioUnlocked.value = true
    return true
  } catch (err) {
    audioUnlocked.value = false
    return false
  }
}

function promiseWithTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise(resolve => window.setTimeout(resolve, timeoutMs))
  ])
}

function createAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) {
    throw new Error('AUDIO_CONTEXT_UNSUPPORTED')
  }
  return new AudioContextClass()
}

function playRealtimeAudio(arrayBuffer) {
  if (!audioContext.value) {
    audioContext.value = createAudioContext()
  }
  if (audioContext.value.state === 'suspended') {
    audioContext.value.resume().catch(() => {
      showError('音频播放被浏览器拦截，请点击“重新连接语音”后再继续面试')
    })
  }
  const samples = decodePcm16(arrayBuffer)
  if (!samples.length) {
    return
  }
  const source = audioContext.value.createBufferSource()
  const buffer = audioContext.value.createBuffer(1, samples.length, 24000)
  buffer.copyToChannel(samples, 0)
  source.buffer = buffer
  source.connect(audioContext.value.destination)
  const startAt = Math.max(audioContext.value.currentTime + 0.02, nextPlayTime.value)
  activeAudioSources.add(source)
  source.start(startAt)
  nextPlayTime.value = startAt + buffer.duration
  source.onended = () => {
    activeAudioSources.delete(source)
    scheduleMicrophoneUploadResume(300)
  }
  pauseMicrophoneUploadUntilAudioEnds()
}

function clearQueuedRealtimeAudio() {
  activeAudioSources.forEach(source => {
    try {
      source.onended = null
      source.stop(0)
    } catch (err) {
    }
  })
  activeAudioSources.clear()
  if (audioContext.value) {
    nextPlayTime.value = audioContext.value.currentTime + 0.02
  } else {
    nextPlayTime.value = 0
  }
}

function pauseMicrophoneUpload(durationMs = 800) {
  const until = Date.now() + durationMs
  if (until > micUploadPausedUntil.value) {
    micUploadPausedUntil.value = until
  }
  scheduleMicrophoneUploadResume(durationMs)
}

function pauseMicrophoneUploadUntilAudioEnds() {
  const context = audioContext.value
  if (!context) {
    return
  }
  const remainingMs = Math.max(300, Math.ceil((nextPlayTime.value - context.currentTime) * 1000) + 300)
  pauseMicrophoneUpload(remainingMs)
}

function scheduleMicrophoneUploadResume(delayMs = 300) {
  if (micUploadResumeTimer.value) {
    window.clearTimeout(micUploadResumeTimer.value)
  }
  const remainingPauseMs = Math.max(0, micUploadPausedUntil.value - Date.now())
  const waitMs = Math.max(delayMs, remainingPauseMs)
  micUploadResumeTimer.value = window.setTimeout(() => {
    if (Date.now() >= micUploadPausedUntil.value) {
      micUploadPausedUntil.value = 0
    } else {
      scheduleMicrophoneUploadResume(100)
      return
    }
    micUploadResumeTimer.value = null
  }, waitMs)
}

function resumeMicrophoneUpload() {
  micUploadPausedUntil.value = 0
  if (micUploadResumeTimer.value) {
    window.clearTimeout(micUploadResumeTimer.value)
    micUploadResumeTimer.value = null
  }
}

function isMicrophoneUploadPaused() {
  return Date.now() < micUploadPausedUntil.value
}

function extractRealtimeContent(event, raw, fallback) {
  if (event === 'asr_response' && Array.isArray(raw?.results)) {
    return extractFinalAsrText(raw) || extractInterimAsrText(raw)
  }
  return raw?.content || raw?.text || raw?.message || fallback || ''
}

function extractFinalAsrText(raw) {
  if (!Array.isArray(raw?.results)) return ''
  return raw.results.filter(item => !item.is_interim).map(item => item.text || '').join('')
}

function extractInterimAsrText(raw) {
  if (!Array.isArray(raw?.results)) return ''
  return raw.results.map(item => item.text || '').join('')
}

function resampleTo16k(input, sourceRate) {
  if (!input.length) return new Float32Array()
  if (sourceRate === 16000) return input
  const ratio = sourceRate / 16000
  const outputLength = Math.floor(input.length / ratio)
  const output = new Float32Array(outputLength)
  for (let i = 0; i < outputLength; i += 1) {
    const sourceIndex = i * ratio
    const before = Math.floor(sourceIndex)
    const after = Math.min(before + 1, input.length - 1)
    const weight = sourceIndex - before
    output[i] = input[before] * (1 - weight) + input[after] * weight
  }
  return output
}

function encodePcm16(samples) {
  const buffer = new ArrayBuffer(samples.length * 2)
  const view = new DataView(buffer)
  samples.forEach((sample, index) => {
    const clamped = Math.max(-1, Math.min(1, sample))
    view.setInt16(index * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true)
  })
  return buffer
}

function createSilencePcm(inputLength, sourceRate) {
  const sampleCount = sourceRate === 16000
    ? inputLength
    : Math.floor(inputLength / (sourceRate / 16000))
  return new ArrayBuffer(Math.max(0, sampleCount) * 2)
}

function decodePcm16(arrayBuffer) {
  const view = new DataView(arrayBuffer)
  const length = Math.floor(view.byteLength / 2)
  const samples = new Float32Array(length)
  for (let i = 0; i < length; i += 1) {
    samples[i] = view.getInt16(i * 2, true) / 0x8000
  }
  return samples
}

function arrayBufferToBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

function getMicrophoneErrorMessage(err) {
  if (err?.message === 'MICROPHONE_UNSUPPORTED') {
    return '当前浏览器不支持麦克风，请使用手机 Safari/Chrome 并通过 HTTPS 打开面试链接'
  }
  if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
    return '麦克风权限被拒绝，请在浏览器地址栏允许麦克风后重新连接'
  }
  if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
    return '没有检测到可用麦克风，请检查手机麦克风或浏览器权限'
  }
  if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
    return '麦克风被其他应用占用，请关闭占用后重新连接'
  }
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    return '手机浏览器需要 HTTPS 才能使用麦克风，请用 HTTPS 面试地址打开'
  }
  return '麦克风启动失败，请检查浏览器权限后重新连接'
}

function buildRealtimeWsUrl(path, ticket) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const normalizedPath = path || '/ws/public/interviews/realtime'
  return `${protocol}//${window.location.host}${normalizedPath}?ticket=${encodeURIComponent(ticket)}`
}
</script>
