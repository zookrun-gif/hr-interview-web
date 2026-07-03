<template>
  <div class="rich-text-editor">
    <Toolbar
      class="rich-text-toolbar"
      :editor="editorRef"
      :defaultConfig="toolbarConfig"
      mode="default"
    />
    <Editor
      v-model="editorHtml"
      class="rich-text-body"
      :defaultConfig="editorConfig"
      mode="default"
      @onCreated="handleCreated"
    />
  </div>
</template>

<script setup>
import '@wangeditor/editor/dist/css/style.css'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import { computed, onBeforeUnmount, shallowRef } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: '请输入内容'
  }
})

const emit = defineEmits(['update:modelValue'])

const editorRef = shallowRef(null)

const editorHtml = computed({
  get: () => props.modelValue || '',
  set: value => emit('update:modelValue', value || '')
})

const toolbarConfig = {
  excludeKeys: [
    'group-image',
    'group-video',
    'fullScreen',
    'insertTable',
    'codeBlock'
  ]
}

const editorConfig = {
  placeholder: props.placeholder,
  scroll: true
}

function handleCreated(editor) {
  editorRef.value = editor
}

onBeforeUnmount(() => {
  if (editorRef.value) {
    editorRef.value.destroy()
  }
})
</script>
