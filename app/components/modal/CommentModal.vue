<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { notifyError, notifySuccess } from '~/utils/notify'
import { api, ApiRequestError } from '~/utils/api'
import AvatarImg from '~/components/AvatarImg.vue'

const props = defineProps<{
  visible: boolean
  /** 目标动态 ID */
  momentId: string
  /** 当前登录用户（用于显示头像/未登录提示） */
  currentUser?: { id: string; displayName: string; avatar?: string | null } | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'sent'): void
}>()

// 评论输入内容
const content = ref('')
// 表情面板是否展开
const showEmoji = ref(false)
// 发送中
const sending = ref(false)
// textarea 引用，用于聚焦与光标操作
const textareaRef = ref<HTMLTextAreaElement | null>(null)

// 后端限制 consts.MaxCommentLen = 1000
const maxLen = 1000
const remaining = computed(() => maxLen - content.value.length)
const canSend = computed(() => content.value.trim().length > 0 && !sending.value)

// 弹窗打开时聚焦输入框并重置状态
watch(
  () => props.visible,
  async (v) => {
    if (v) {
      content.value = ''
      showEmoji.value = false
      sending.value = false
      await nextTick()
      textareaRef.value?.focus()
    }
  }
)

// 常用表情列表（与社区氛围匹配的轻量集合，避免引入额外依赖）
const emojis = [
  '😀', '😂', '🥰', '😍', '🤔', '😅', '😭', '😡',
  '👍', '👎', '👏', '🙌', '🤝', '💪', '🎉', '✨',
  '❤️', '💔', '🔥', '⭐', '🌈', '🎵', '🐱', '🌸',
  '🥺', '😴', '🤣', '😇', '😎', '🤩', '🙄', '💩',
]

// 在 textarea 当前光标位置插入文本
function insertAtCursor(text: string): void {
  const el = textareaRef.value
  if (!el) {
    content.value += text
    return
  }
  const start = el.selectionStart ?? content.value.length
  const end = el.selectionEnd ?? content.value.length
  content.value = content.value.slice(0, start) + text + content.value.slice(end)
  nextTick(() => {
    el.focus()
    const pos = start + text.length
    el.setSelectionRange(pos, pos)
  })
}

const handleEmojiClick = (emoji: string) => {
  insertAtCursor(emoji)
}

const handleMention = () => {
  // @某人：插入 @ 占位符，后续可接入用户搜索面板
  // 目前无用户搜索接口，仅插入标记并聚焦，由用户手动输入被提及的用户名
  insertAtCursor('@')
}

const handleClose = () => {
  if (sending.value) return
  emit('update:visible', false)
}

const handleOverlayClick = () => {
  handleClose()
}

const handleSend = async () => {
  if (!canSend.value) return
  // 未登录提示（后端也会拦截，但前端先给更好体验）
  if (!props.currentUser) {
    notifyError(new Error('请先登录后再评论'), '请先登录后再评论')
    return
  }
  sending.value = true
  try {
    const res = await api.createMomentComment(props.momentId, content.value.trim())
    content.value = ''
    showEmoji.value = false
    notifySuccess(res.msg || '评论成功')
    emit('sent')
    emit('update:visible', false)
  } catch (err) {
    // 权限不足（仅好友/仅粉丝/禁止评论）后端返回 403，msg 已带业务说明
    if (err instanceof ApiRequestError && err.httpStatus === 401) {
      notifyError(err, '请先登录后再评论')
    } else {
      notifyError(err, '评论失败')
    }
  } finally {
    sending.value = false
  }
}

// Ctrl/Cmd + Enter 快捷发送
const handleKeydown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    handleSend()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="visible"
        class="fixed inset-0 bg-black/30 backdrop-blur-md z-50 flex items-end justify-center sm:p-4"
        @click.self="handleOverlayClick"
      >
        <Transition name="sheet">
          <div
            v-if="visible"
            class="comment-modal-glass glass-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-xl overflow-hidden relative"
            @keydown="handleKeydown"
            tabindex="-1"
          >
            <!-- 顶部拖动条（移动端视觉锚点） -->
            <div class="pt-3 pb-1 flex justify-center sm:hidden">
              <div class="w-10 h-1 rounded-full bg-gray-300"></div>
            </div>

            <!-- 标题栏 -->
            <div class="flex items-center justify-between px-4 pt-3 pb-2">
              <h3 class="text-base font-medium text-gray-800">发表评论</h3>
              <button
                class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                @click="handleClose"
              >
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>

            <!-- 输入区 -->
            <div class="px-4 pb-2">
              <!-- 当前用户头像 + 文本框 -->
              <div class="flex items-start gap-3">
                <div class="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-lime-400 to-lime-500 flex items-center justify-center">
                  <AvatarImg
                    :avatar-uuid="currentUser?.avatar"
                    class="w-full h-full"
                  ></AvatarImg>
                </div>
                <textarea
                  ref="textareaRef"
                  v-model="content"
                  class="flex-1 min-h-[100px] max-h-[240px] resize-none rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5 text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-lime-400 focus:bg-white transition-colors"
                  placeholder="写下你的评论..."
                  :maxlength="maxLen"
                  rows="4"
                ></textarea>
              </div>

              <!-- 字数统计 -->
              <div class="flex justify-end mt-1.5">
                <span class="text-xs" :class="remaining < 0 ? 'text-red-500' : 'text-gray-400'">
                  {{ remaining }}
                </span>
              </div>
            </div>

            <!-- 表情面板 -->
            <Transition name="expand">
              <div v-if="showEmoji" class="px-4 pb-2">
                <div class="grid grid-cols-8 gap-1 bg-gray-50 rounded-xl p-2 max-h-40 overflow-y-auto">
                  <button
                    v-for="emoji in emojis"
                    :key="emoji"
                    class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white text-xl transition-colors"
                    @click="handleEmojiClick(emoji)"
                  >
                    {{ emoji }}
                  </button>
                </div>
              </div>
            </Transition>

            <!-- 底部功能栏 -->
            <div class="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <!-- 左侧工具按钮 -->
              <div class="flex items-center gap-1">
                <button
                  class="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
                  :class="{ 'text-lime-600 bg-lime-50': showEmoji }"
                  title="表情"
                  @click="showEmoji = !showEmoji"
                >
                  <i class="fa-regular fa-face-smile text-lg"></i>
                </button>
                <button
                  class="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
                  title="@某人"
                  @click="handleMention"
                >
                  <i class="fa-solid fa-at text-lg"></i>
                </button>
              </div>

              <!-- 右侧发送按钮 -->
              <button
                class="flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium transition-all"
                :class="canSend
                  ? 'bg-lime-500 text-white hover:bg-lime-600 shadow-sm'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'"
                :disabled="!canSend"
                @click="handleSend"
              >
                <i v-if="sending" class="fa-solid fa-circle-notch fa-spin"></i>
                <i v-else class="fa-solid fa-paper-plane"></i>
                <span>{{ sending ? '发送中' : '发送' }}</span>
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 底部弹窗底板：毛玻璃 + 液态玻璃（复用全局 glass-card，叠加圆角适配） */
:global(.comment-modal-glass) {
  background-color: rgba(255, 255, 255, 0.82);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  backdrop-filter: blur(18px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow:
    0 -2px 0 rgba(255, 255, 255, 0.5) inset,
    0 8px 32px rgba(17, 24, 39, 0.1),
    0 2px 4px rgba(17, 24, 39, 0.04);
}

/* 遮罩淡入淡出 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 底部弹窗滑入滑出 */
.sheet-enter-active,
.sheet-leave-active {
  transition: transform 0.28s cubic-bezier(0.34, 1.2, 0.64, 1), opacity 0.25s ease;
}
.sheet-enter-from,
.sheet-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

/* 表情面板展开动画 */
.expand-enter-active,
.expand-leave-active {
  transition: max-height 0.2s ease, opacity 0.2s ease;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
.expand-enter-to,
.expand-leave-from {
  max-height: 200px;
  opacity: 1;
}

/* 低性能设备降级 */
:global(.low-perf .comment-modal-glass) {
  background-color: rgba(255, 255, 255, 0.96);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}
</style>