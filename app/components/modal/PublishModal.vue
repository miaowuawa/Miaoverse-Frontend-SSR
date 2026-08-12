<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { Input } from 'ant-design-vue'
import Modal from './Modal.vue'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'submit', payload: { content: string; visibility: string }): void
}>()

// 文本内容
const content = ref('')
// 公开/私密等可见性
const visibility = ref('public')
// 字数上限（安全/反垃圾：限制内容长度）
const MAX_LENGTH = 5000

const isSubmittable = computed(() => content.value.trim().length > 0 && content.value.length <= MAX_LENGTH)
const charCount = computed(() => content.value.length)

watch(() => props.visible, (val) => {
  if (val) {
    content.value = ''
    visibility.value = 'public'
    nextTick(() => {
      textareaRef.value?.focus()
    })
  }
})

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = () => {
  if (!isSubmittable.value) return
  // 安全：仅提交纯文本，渲染侧由 Vue 自动转义；不解析 HTML/Markdown
  emit('submit', { content: content.value.trim(), visibility: visibility.value })
  content.value = ''
  emit('update:visible', false)
}

// 工具栏按钮（占位交互，未来接入图片/投票/话题/@/表情）
const toolbarItems = [
  { id: 'image', icon: 'fa-images', title: '图片' },
  { id: 'upload', icon: 'fa-cloud-arrow-up', title: '上传' },
  { id: 'poll', icon: 'fa-square-poll-horizontal', title: '投票' },
  { id: 'nsfw', icon: 'fa-eye-slash', title: '敏感内容' },
  { id: 'topic', icon: 'fa-hashtag', title: '话题' },
  { id: 'mention', icon: 'fa-at', title: '提到' },
]

const textareaRef = ref<InstanceType<typeof Input.TextArea> | null>(null)
</script>

<template>
  <Modal
    :visible="visible"
    width="max-w-2xl"
    position="center"
    :show-close="false"
    :close-on-overlay="true"
    card-class="publish-modal-glass"
    @close="handleClose"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="flex flex-col">
      <!-- 顶部工具栏 -->
      <div class="flex items-center justify-between px-4 pt-4 pb-3">
        <div class="flex items-center gap-3">
          <button
            class="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100/60 transition-colors"
            @click="handleClose"
          >
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>
          <div class="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-sm">
            <i class="fa-solid fa-ellipsis text-white"></i>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- 可见性选择 -->
          <button
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-gray-600 hover:bg-gray-100/60 transition-colors"
            :class="{ 'text-lime-600 bg-lime-50/60': visibility === 'public' }"
            @click="visibility = 'public'"
          >
            <i class="fa-solid fa-earth-asia text-sm"></i>
            <span>公开</span>
          </button>
          <button
            class="flex items-center justify-center w-8 h-8 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100/60 transition-colors"
            title="链接"
          >
            <i class="fa-solid fa-link text-sm"></i>
          </button>
          <button
            class="flex items-center justify-center w-8 h-8 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100/60 transition-colors"
            title="更多选项"
          >
            <i class="fa-solid fa-ellipsis text-sm"></i>
          </button>
          <button
            class="ml-2 px-5 py-2 rounded-lg bg-lime-500 hover:bg-lime-600 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            :disabled="!isSubmittable"
            @click="handleSubmit"
          >
            <span>发帖</span>
            <i class="fa-solid fa-paper-plane text-sm"></i>
          </button>
        </div>
      </div>

      <!-- 输入区：增强可读性的玻璃输入框 -->
      <div class="px-4 pb-2">
        <div class="publish-input-glass rounded-xl">
          <Input.TextArea
            ref="textareaRef"
            v-model:value="content"
            :rows="5"
            :maxlength="MAX_LENGTH"
            :bordered="false"
            placeholder="写些什么吧"
            class="publish-textarea"
          />
        </div>
        <div class="flex justify-end mt-1.5">
          <span class="text-xs text-gray-400" :class="{ 'text-red-500': charCount > MAX_LENGTH }">
            {{ charCount }}/{{ MAX_LENGTH }}
          </span>
        </div>
      </div>

      <!-- 底部工具栏 -->
      <div class="flex items-center justify-between px-4 py-3 border-t border-white/40">
        <div class="flex items-center gap-1">
          <button
            v-for="item in toolbarItems"
            :key="item.id"
            class="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-lime-600 hover:bg-lime-50/50 transition-colors"
            :title="item.title"
          >
            <i :class="['fa-solid', item.icon]"></i>
          </button>
        </div>
        <button
          class="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-lime-600 hover:bg-lime-50/50 transition-colors"
          title="表情"
        >
          <i class="fa-regular fa-face-smile text-lg"></i>
        </button>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
/* 弹窗玻璃：复用项目 glass-card 变量，但提高透明度让背景轻微透出 */
:global(.publish-modal-glass) {
  background-color: rgba(255, 255, 255, 0.68);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
  backdrop-filter: blur(18px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.65);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.75) inset,
    0 -1px 0 rgba(255, 255, 255, 0.3) inset,
    0 8px 32px rgba(17, 24, 39, 0.08),
    0 2px 4px rgba(17, 24, 39, 0.04);
}

/* 输入框玻璃层：比弹窗更实、更白，保证文字可读；同时保留轻微磨砂感 */
.publish-input-glass {
  position: relative;
  background-color: rgba(255, 255, 255, 0.86);
  -webkit-backdrop-filter: blur(10px) saturate(140%);
  backdrop-filter: blur(10px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.7);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 -1px 0 rgba(255, 255, 255, 0.4) inset,
    0 1px 3px rgba(17, 24, 39, 0.04);
  overflow: hidden;
}

/* Ant Design TextArea 重置，使其融入玻璃容器 */
:deep(.publish-textarea) {
  background: transparent !important;
  resize: none !important;
  padding: 14px 16px !important;
  font-size: 15px;
  line-height: 1.6;
  color: #374151 !important;
}

:deep(.publish-textarea::placeholder) {
  color: #9ca3af;
}

:deep(.publish-textarea:focus) {
  box-shadow: none !important;
}

/* 低性能设备：去掉 backdrop-filter 避免合成层问题，同时保持可读性 */
:global(.low-perf .publish-modal-glass) {
  background-color: rgba(255, 255, 255, 0.94);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}

:global(.low-perf .publish-input-glass) {
  background-color: #ffffff;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  border: 1区 solid #e5e7eb;
}
</style>
