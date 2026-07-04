<template>
  <main class="interview-page">
    <section class="interview-panel">
      <div class="interview-header">
        <div class="interview-brand-title">
          <img class="brand-logo" :src="brandLogo" alt="奢享家" />
          <span>奢享家 HR 面试间</span>
        </div>
        <button class="primary" :disabled="isCompleted" @click="enterInterview">
          {{ isEntered ? '已进入面试' : '进入面试' }}
        </button>
      </div>

      <div class="interview-meta-grid">
        <div>
          <small>面试岗位</small>
          <b>{{ interview?.jobTitle || '-' }}</b>
        </div>
        <div>
          <small>面试人</small>
          <b>{{ interview?.candidateName || '-' }}</b>
        </div>
        <div>
          <small>面试状态</small>
          <b>{{ interviewStatusText }}</b>
        </div>
        <div>
          <small>实时语音</small>
          <b>{{ realtimeStatusText }}</b>
        </div>
      </div>

      <div v-if="showAccessInput" class="access-panel">
        <label>
          面试口令
          <input
            v-model="accessCode"
            type="password"
            maxlength="32"
            autocomplete="one-time-code"
            inputmode="text"
            placeholder="请输入 HR 提供的面试口令"
            @keyup.enter="enterInterview"
          />
        </label>
      </div>

      <div class="conversation">
        <div class="conversation-title">
          <b>面试对话</b>
          <span>{{ realtimeHint }}</span>
        </div>
        <div class="bubble ai">你好，我是本次 AI 面试官。进入面试后，我会根据岗位和简历进行提问。</div>
        <div v-for="message in realtimeMessages" :key="message.id" :class="['bubble', message.role]">
          {{ message.content }}
        </div>
      </div>

      <form v-if="isEntered && !isCompleted" class="interview-say-form" @submit.prevent="sendTextQuery">
        <input v-model.trim="textQuery" placeholder="也可以输入文字补充回答" />
        <button class="primary" type="submit" :disabled="!textQuery || realtimeStatus !== 'connected'">发送</button>
      </form>

      <div v-if="isEntered && !isCompleted" class="interview-finish-tip">
        面试不会自动结束。回答完成后，请手动点击“结束面试”，系统才会生成面试结果。
      </div>

      <div class="interview-actions">
        <button @click="reload">刷新状态</button>
        <button :disabled="!isEntered || isCompleted || realtimeConnecting" @click="connectRealtime">
          {{ realtimeButtonText }}
        </button>
        <button class="danger" :disabled="!isEntered || isCompleted" @click="finishInterview">结束面试</button>
      </div>
      <audio ref="remoteAudio" autoplay></audio>
    </section>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { publicInterviewApi } from '../api/hr'
import { showError, showSuccess } from '../utils/message'
import brandLogo from '../assets/shexiangjia-logo.png'

const route = useRoute()
const token = route.params.token
const interview = ref(null)
const accessCode = ref('')
const remoteAudio = ref(null)
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
const audioUnlocked = ref(false)
const currentUserMessageId = ref(null)
const currentAiMessageId = ref(null)
const hasAiChatResponseInTurn = ref(false)
const realtimeHeartbeatTimer = ref(null)
const manualRealtimeClosing = ref(false)
const lastRealtimeError = ref('')

const isEntered = computed(() => interview.value?.status === 'IN_PROGRESS')
const isCompleted = computed(() => interview.value?.status === 'COMPLETED')
const normalizedAccessCode = computed(() => accessCode.value.trim())
const showAccessInput = computed(() => !isCompleted.value && !isEntered.value)
const interviewStatusText = computed(() => {
  const map = {
    INVITED: '已邀请',
    WAITING: '等待中',
    IN_PROGRESS: '面试中',
    COMPLETED: '已完成',
    FAILED: '失败'
  }
  return map[interview.value?.status] || interview.value?.status || '加载中'
})
const realtimeStatusText = computed(() => {
  const map = {
    idle: '未连接',
    connecting: '连接中',
    connected: '已连接',
    disconnected: '已断开',
    failed: '连接失败'
  }
  return map[realtimeStatus.value] || '未连接'
})
const realtimeButtonText = computed(() => realtimeStatus.value === 'connected' ? '重新连接实时语音' : '连接实时语音')
const realtimeHint = computed(() => {
  if (!isEntered.value) return '输入口令进入面试后，可以连接实时语音通道。'
  if (realtimeStatus.value === 'connected') return '实时语音已连接，直接开口回答即可。'
  if (realtimeStatus.value === 'connecting') return '正在连接实时语音通道，请稍候。'
  if (realtimeStatus.value === 'failed') return lastRealtimeError.value || '实时语音连接失败，请稍后重试。'
  if (realtimeStatus.value === 'disconnected') return lastRealtimeError.value || '实时语音已断开，请点击重新连接。'
  return '点击连接实时语音后，会开启麦克风并接入火山端到端实时语音。'
})

onMounted(reload)
onBeforeUnmount(disconnectRealtime)

async function reload() {
  try {
    interview.value = await publicInterviewApi.detail({ token })
  } catch (err) {
  }
}

async function enterInterview() {
  const code = normalizedAccessCode.value
  if (!code) {
    showError('请输入面试口令')
    return
  }
  try {
    await unlockMobileAudio()
    interview.value = await publicInterviewApi.enter({ token, accessCode: code })
    accessCode.value = code
    showSuccess('已进入面试')
  } catch (err) {
  }
}

async function finishInterview() {
  const code = normalizedAccessCode.value
  if (!code) {
    showError('请输入面试口令')
    return
  }
  try {
    disconnectRealtime()
    interview.value = await publicInterviewApi.finish({ token, accessCode: code })
    showSuccess('面试已结束')
  } catch (err) {
  }
}

async function connectRealtime() {
  if (!isEntered.value) {
    showError('请先进入面试')
    return
  }
  const code = normalizedAccessCode.value
  if (!code) {
    showError('请输入面试口令')
    return
  }
  await unlockMobileAudio()
  disconnectRealtime(true, false)
  lastRealtimeError.value = ''
  manualRealtimeClosing.value = false
  realtimeConnecting.value = true
  realtimeStatus.value = 'connecting'
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
      realtimeStatus.value = 'connected'
      showSuccess('实时语音已连接')
      startRealtimeHeartbeat()
      bindMicrophoneToRealtimeSocket()
    }
    socket.onmessage = event => handleRealtimeMessage(event)
    socket.onerror = () => {
      realtimeStatus.value = 'failed'
      lastRealtimeError.value = '实时语音连接异常，请检查网络后重新连接。'
    }
    socket.onclose = event => {
      stopRealtimeHeartbeat()
      stopMicrophoneCapture()
      realtimeSocket.value = null
      if (manualRealtimeClosing.value) {
        manualRealtimeClosing.value = false
        return
      }
      if (realtimeStatus.value !== 'failed') {
        realtimeStatus.value = 'disconnected'
      }
      const reason = event.reason ? `，原因：${event.reason}` : ''
      lastRealtimeError.value = `实时语音已断开，请点击重新连接。关闭码：${event.code}${reason}`
    }
  } catch (err) {
    realtimeStatus.value = 'failed'
    lastRealtimeError.value = microphoneReady ? '实时语音连接失败，请检查网络后重新连接' : getMicrophoneErrorMessage(err)
    showError(lastRealtimeError.value)
    disconnectRealtime(false)
  } finally {
    realtimeConnecting.value = false
  }
}

function disconnectRealtime(resetStatus = true, sendFinish = true) {
  stopRealtimeHeartbeat()
  stopMicrophoneCapture()
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
    lastRealtimeError.value = ''
  }
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
    const pcm = encodePcm16(resampleTo16k(input, audioContext.value.sampleRate))
    if (pcm.byteLength > 0) {
      realtimeSocket.value.send(`audio:${arrayBufferToBase64(pcm)}`)
    }
  }
  mediaSource.value.connect(audioProcessor.value)
}

function stopMicrophoneCapture() {
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
    if (payload.event === 'error' || payload.event === 'dialog_error') {
      realtimeStatus.value = 'failed'
      lastRealtimeError.value = content || 'Realtime 模型返回异常'
      showError(lastRealtimeError.value)
      return
    }
    if (payload.event === 'disconnected') {
      realtimeStatus.value = 'disconnected'
      lastRealtimeError.value = content || '实时语音已断开，请点击重新连接。'
      return
    }
    handleRealtimeTextEvent(payload.event, raw, content)
  } catch (err) {
    showError(text)
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
  if (!content) return
  if (event === 'chat_response') {
    hasAiChatResponseInTurn.value = true
    appendAiMessage(content)
    return
  }
  if (event === 'tts_sentence_start') {
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
    return
  }
  const id = Date.now() + Math.random()
  realtimeMessages.value.push({ id, role: 'ai', content: normalized })
  currentAiMessageId.value = id
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
    realtimeMessages.value.push({ id, role, content: normalized })
    idRef.value = id
  }
  if (finalMessage) {
    idRef.value = null
  }
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
      await context.resume()
    }
    audioUnlocked.value = true
    return true
  } catch (err) {
    audioUnlocked.value = false
    return false
  }
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
      showError('音频播放被浏览器拦截，请点击“连接实时语音”后再继续面试')
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
  source.start(startAt)
  nextPlayTime.value = startAt + buffer.duration
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
