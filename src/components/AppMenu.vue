<template>
  <nav class="nav">
    <button
      v-for="item in items"
      :key="item.key"
      type="button"
      :class="['nav-item', { active: item.active, open: item.open }]"
      @click="$emit('select', item.key)"
    >
      <component :is="item.icon" class="nav-icon" :size="18" stroke-width="2.2" />
      <span>{{ item.label }}</span>
      <ChevronDown
        v-if="item.children?.length"
        class="nav-arrow"
        :class="{ open: item.open }"
        :size="16"
        stroke-width="2.2"
      />
    </button>

    <div
      v-for="item in items"
      :key="`${item.key}-children`"
      v-show="item.open && item.children?.length"
      class="sub-nav"
    >
      <button
        v-for="child in item.children"
        :key="child.key"
        type="button"
        :class="['nav-item sub-nav-item', { active: child.active }]"
        @click="$emit('select', child.key)"
      >
        <component :is="child.icon" class="nav-icon" :size="16" stroke-width="2.2" />
        <span>{{ child.label }}</span>
      </button>
    </div>
  </nav>
</template>

<script setup>
import { ChevronDown } from '@lucide/vue'

defineProps({
  items: {
    type: Array,
    default: () => []
  }
})

defineEmits(['select'])
</script>
