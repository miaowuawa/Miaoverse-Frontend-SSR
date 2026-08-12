<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { Input } from 'ant-design-vue'
import Modal from './Modal.vue'
import { api } from '~/utils/api'
import { notifyError } from '~/utils/notify'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'published', payload: {
    content: string
    visibility: string
    permission: number
    commentPermission: number
    top: number
    fileUuids: string[]
  }): void
}>()

// 文本内容
const content = ref('')
// 字数上限（安全/反垃圾：限制内容长度）
const MAX_LENGTH = 5000
// 图片数量上限（与后端 MaxMomentImages=9 一致，超限由服务端兜底拒绝）
const MAX_IMAGES = 9

// 可见权限（与后端 MomentPermission* 常量一一对应）
const PERMISSION_OPTIONS = [
  { value: 0, label: '公开', icon: 'fa-earth-asia' },
  { value: 1, label: '仅好友', icon: 'fa-user-group' },
  { value: 2, label: '仅自己', icon: 'fa-lock' },
  { value: 3, label: '仅粉丝', icon: 'fa-star' },
] as const

// 评论权限（与后端 MomentCommentPermission* 常量一一对应）
const COMMENT_PERMISSION_OPTIONS = [
  { value: 0, label: '所有人可评论' },
  { value: 1, label: '仅好友可评论' },
  { value: 2, label: '仅粉丝可评论' },
  { value: 3, label: '所有人不可评论' },
] as const

// 可见权限：value 为后端枚举值
const permission = ref<number>(0)
// 更多设置：评论权限 / 个人置顶
const commentPermission = ref<number>(0)
const top = ref<number>(0)

// 图片：本地文件 + 预览 URL + 已上传文件 UUID
interface PickedImage {
  file: File
  previewUrl: string
  uuid: string
}
const imageList = ref<PickedImage[]>([])

// 更多设置弹窗显隐
const showMore = ref(false)
// 可见权限选项框显隐
const showPermissionMenu = ref(false)
// 提交中标记：防止上传/发布期间重复点击
const submitting = ref(false)

const isSubmittable = computed(() =>
  content.value.trim().length > 0 &&
  content.value.length <= MAX_LENGTH &&
  !submitting.value
)
const charCount = computed(() => content.value.length)

const permissionLabel = computed(() =>
  PERMISSION_OPTIONS.find((o) => o.value === permission.value)?.label ?? '公开'
)
const permissionIcon = computed(() =>
  PERMISSION_OPTIONS.find((o) => o.value === permission.value)?.icon ?? 'fa-earth-asia'
)

const currentCommentPermissionLabel = computed(() =>
  COMMENT_PERMISSION_OPTIONS.find((o) => o.value === commentPermission.value)?.label ?? '所有人可评论'
)

// 选择图片：客户端仅做类型与数量校验，大小/类型最终由服务端校验（上传大小由配置控制）
const fileInputRef = ref<HTMLInputElement | null>(null)

const openFilePicker = () => {
  fileInputRef.value?.click()
}

const handleFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (files.length === 0) return

  const remaining = MAX_IMAGES - imageList.value.length
  if (remaining <= 0) {
    notifyError(null, `最多上传 ${MAX_IMAGES} 张图片`)
    return
  }
  const picked = files.slice(0, remaining)
  for (const file of picked) {
    if (!file.type.startsWith('image/')) {
      notifyError(null, '仅支持上传图片文件')
      continue
    }
    imageList.value.push({
      file,
      previewUrl: URL.createObjectURL(file),
      uuid: '',
    })
  }
}

// 移除图片：同时释放本地预览 URL
const removeImage = (index: number) => {
  const item = imageList.value[index]
  if (item) {
    URL.revokeObjectURL(item.previewUrl)
  }
  imageList.value.splice(index, 1)
}

// 释放全部预览 URL（关闭/重置时调用）
const releasePreviews = () => {
  for (const item of imageList.value) {
    URL.revokeObjectURL(item.previewUrl)
  }
  imageList.value = []
}

const reset = () => {
  content.value = ''
  permission.value = 0
  commentPermission.value = 0
  top.value = 0
  submitting.value = false
  releasePreviews()
  showMore.value = false
  showPermissionMenu.value = false
}

watch(() => props.visible, (val) => {
  if (val) {
    reset()
    nextTick(() => {
      textareaRef.value?.focus()
    })
  }
})

const handleClose = () => {
  emit('update:visible', false)
}

// 上传全部图片，返回 UUID 列表；任一失败则抛出，由调用方中断发布。
// 已上传过的图片直接复用 UUID，避免重复上传。
async function uploadImages(): Promise<string[]> {
  const uuids: string[] = []
  for (const item of imageList.value) {
    if (item.uuid) {
      uuids.push(item.uuid)
      continue
    }
    const info = await api.uploadFile(item.file, 'image', 2)
    item.uuid = info.uuid
    uuids.push(info.uuid)
  }
  return uuids
}

const handleSubmit = async () => {
  if (!isSubmittable.value) return
  submitting.value = true

  let fileUuids: string[] = []
  if (imageList.value.length > 0) {
    try {
      fileUuids = await uploadImages()
    } catch (err) {
      notifyError(err, '图片上传失败')
      submitting.value = false
      return
    }
  }

  try {
    // 安全：仅提交纯文本，渲染侧由 Vue 自动转义；不解析 HTML/Markdown
    // 发布成功后才关闭弹窗并清空内容，失败时保留内容便于修改重试
    await api.publishMoment({
      content: content.value.trim(),
      permission: permission.value,
      comment_permission: commentPermission.value,
      top: top.value,
      file_uuids: fileUuids.length > 0 ? fileUuids : undefined,
    })
    emit('published', {
      content: content.value.trim(),
      visibility: permissionLabel.value,
      permission: permission.value,
      commentPermission: commentPermission.value,
      top: top.value,
      fileUuids,
    })
    reset()
    emit('update:visible', false)
  } catch (err) {
    notifyError(err, '发布失败')
    submitting.value = false
  }
}

// 工具栏按钮（图片已接入真实上传，其余为占位交互）
const toolbarItems = [
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
          <!-- 可见性选择：点击弹出权限选项框 -->
          <div class="relative">
            <button
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-gray-600 hover:bg-gray-100/60 transition-colors"
              :class="{ 'text-lime-600 bg-lime-50/60': permission === 0 }"
              @click="showPermissionMenu = !showPermissionMenu"
            >
              <i :class="['fa-solid', permissionIcon, 'text-sm']"></i>
              <span>{{ permissionLabel }}</span>
              <i class="fa-solid fa-caret-down text-xs text-gray-400"></i>
            </button>
            <!-- 权限选项框：不用 glass-card（其 position:relative 无 layer，会覆盖 utilities 里的 absolute），
                 改用自定义 .perm-menu 类并用 !important 保证浮层定位不被覆盖 -->
            <Transition name="menu-down">
              <div
                v-if="showPermissionMenu"
                class="perm-menu right-0 mt-2 w-40 rounded-xl shadow-xl py-1 z-20 origin-top-right"
              >
                <button
                  v-for="opt in PERMISSION_OPTIONS"
                  :key="opt.value"
                  class="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-lime-50/60 hover:text-lime-700 transition-colors text-left"
                  @click="permission = opt.value; showPermissionMenu = false"
                >
                  <i :class="['fa-solid', opt.icon, 'w-4 text-center text-gray-400']"></i>
                  <span class="flex-1">{{ opt.label }}</span>
                  <i v-if="permission === opt.value" class="fa-solid fa-check text-lime-600 text-xs"></i>
                </button>
              </div>
            </Transition>
          </div>
          <button
            class="flex items-center justify-center w-8 h-8 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100/60 transition-colors"
            title="链接"
          >
            <i class="fa-solid fa-link text-sm"></i>
          </button>
          <button
            class="flex items-center justify-center w-8 h-8 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100/60 transition-colors"
            title="更多选项"
            @click="showMore = true"
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

      <!-- 图片预览区 -->
      <div v-if="imageList.length > 0" class="px-4 pb-2">
        <div class="flex flex-wrap gap-2">
          <div
            v-for="(item, index) in imageList"
            :key="item.previewUrl"
            class="relative w-20 h-20 rounded-xl overflow-hidden group"
          >
            <img
              :src="item.previewUrl"
              :alt="item.file.name"
              class="w-full h-full object-cover"
            >
            <div
              class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity"
            >
              <button
                class="w-7 h-7 rounded-full bg-white/90 text-gray-700 flex items-center justify-center text-xs hover:bg-white transition-colors"
                title="移除"
                @click="removeImage(index)"
              >
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div
              v-if="!item.uuid"
              class="absolute inset-0 bg-black/30 flex items-center justify-center"
              title="上传中/待上传"
            >
              <i class="fa-solid fa-cloud-arrow-up text-white text-lg"></i>
            </div>
          </div>
          <!-- 添加图片 -->
          <button
            v-if="imageList.length < MAX_IMAGES"
            class="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 hover:border-lime-400 hover:bg-lime-50/40 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-lime-600 transition-colors"
            @click="openFilePicker"
          >
            <i class="fa-solid fa-plus text-lg"></i>
            <span class="text-xs">{{ imageList.length }}/{{ MAX_IMAGES }}</span>
          </button>
        </div>
      </div>

      <!-- 底部工具栏 -->
      <div class="flex items-center justify-between px-4 py-3 border-t border-white/40">
        <div class="flex items-center gap-1">
          <button
            class="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-lime-600 hover:bg-lime-50/50 transition-colors"
            :title="'图片'"
            @click="openFilePicker"
          >
            <i class="fa-solid fa-images"></i>
          </button>
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

    <!-- 隐藏的文件选择框（图片上传） -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      multiple
      class="hidden"
      @change="handleFileChange"
    >

    <!-- 更多设置弹窗：置顶调整 + 评论权限设置 -->
    <Modal
      :visible="showMore"
      width="max-w-md"
      position="center"
      :show-close="true"
      :close-on-overlay="true"
      card-class="publish-modal-glass"
      @close="showMore = false"
      @update:visible="showMore = $event"
    >
      <div class="p-5 flex flex-col gap-5">
        <h3 class="text-base font-semibold text-gray-900">更多选项</h3>

        <!-- 置顶调整 -->
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-800 font-medium">置顶动态</p>
            <p class="text-xs text-gray-400 mt-0.5">置顶后显示在个人主页动态列表顶部</p>
          </div>
          <button
            class="relative w-11 h-6 rounded-full transition-colors flex items-center px-0.5"
            :class="top === 1 ? 'bg-lime-500' : 'bg-gray-200'"
            role="switch"
            :aria-checked="top === 1"
            @click="top = top === 1 ? 0 : 1"
          >
            <span
              class="w-5 h-5 bg-white rounded-full shadow transition-all"
              :class="top === 1 ? 'ml-auto' : ''"
            ></span>
          </button>
        </div>

        <!-- 评论权限设置 -->
        <div>
          <p class="text-sm text-gray-800 font-medium mb-2">评论权限</p>
          <p class="text-xs text-gray-400 mb-3">当前：{{ currentCommentPermissionLabel }}</p>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="opt in COMMENT_PERMISSION_OPTIONS"
              :key="opt.value"
              class="px-3 py-2 rounded-xl text-sm transition-colors border"
              :class="commentPermission === opt.value
                ? 'bg-lime-50 border-lime-300 text-lime-700'
                : 'bg-gray-50/60 border-gray-200 text-gray-600 hover:border-gray-300'"
              @click="commentPermission = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <button
          class="mt-1 w-full py-2.5 rounded-xl bg-lime-500 hover:bg-lime-600 text-white text-sm font-medium transition-colors"
          @click="showMore = false"
        >
          完成
        </button>
      </div>
    </Modal>
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

/* 权限选项框浮层：scoped 类带 data-v 属性（特异性 0-2-0），
   可覆盖无 layer 的 .glass-card{position:relative} 与 utilities 里的 .absolute，
   保证浮层绝对定位不被撑开弹窗 */
.perm-menu {
  position: absolute;
  background-color: rgba(255, 255, 255, 0.9);
  -webkit-backdrop-filter: blur(14px) saturate(180%);
  backdrop-filter: blur(14px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.65);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.7) inset,
    0 6px 24px rgba(17, 24, 39, 0.08),
    0 1px 2px rgba(17, 24, 39, 0.04);
}

/* 权限选项框弹出动画 */
.menu-down-enter-active,
.menu-down-leave-active {
  transition: all 0.18s cubic-bezier(0.22, 1, 0.36, 1);
}

.menu-down-enter-from,
.menu-down-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
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
  border: 1px solid #e5e7eb;
}
</style>
