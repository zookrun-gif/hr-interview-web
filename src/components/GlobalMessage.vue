<template>
  <div class="global-message-host">
    <div
      v-for="item in messageState.list"
      :key="item.id"
      :class="['global-message', item.type]"
    >
      <span>{{ item.text }}</span>
      <button class="global-message-close" @click="closeMessage(item.id)">×</button>
    </div>
  </div>
</template>

<script setup>
import { closeMessage, messageState } from '../utils/message'
</script>
