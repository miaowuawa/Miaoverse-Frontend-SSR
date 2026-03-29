<script setup lang="ts">
import { ref } from 'vue'
import { useImageViewer } from '~/composables/useImageViewer'

// 动态数据接口
interface MomentData {
  id: string
  content: string
  images?: string[]
  author: {
    id: string
    name: string
    avatar?: string
    verified?: boolean
  }
  publishTime: string
  location?: string
  stats: {
    likes: number
    comments: number
    shares: number
  }
  isLiked?: boolean
}

const props = defineProps<{
  moment: MomentData
}>()

const emit = defineEmits<{
  (e: 'like', id: string): void
  (e: 'unlike', id: string): void
  (e: 'comment', id: string): void
  (e: 'share', id: string): void
  (e: 'click', id: string): void
  (e: 'user-click', userId: string): void
}>()

// 图片预览
const { openViewer } = useImageViewer()

// 本地状态
const isLiked = ref(props.moment.isLiked || false)
const showFullContent = ref(false)

// 格式化数字
const formatNumber = (num: number): string => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}

// 处理点赞
const handleLike = () => {
  isLiked.value = !isLiked.value
  if (isLiked.value) {
    emit('like', props.moment.id)
  } else {
    emit('unlike', props.moment.id)
  }
}

// 处理评论
const handleComment = () => {
  emit('comment', props.moment.id)
}

// 处理分享
const handleShare = () => {
  emit('share', props.moment.id)
}

// 点击动态
const handleClick = () => {
  emit('click', props.moment.id)
}

// 点击用户
const handleUserClick = () => {
  emit('user-click', props.moment.author.id)
}

// 点击图片预览
const handleImageClick = (index: number) => {
  if (props.moment.images && props.moment.images.length > 0) {
    openViewer(props.moment.images, index)
  }
}

// 是否需要截断内容
const shouldTruncate = props.moment.content.length > 120
const displayContent = ref(
  shouldTruncate && !showFullContent.value
    ? props.moment.content.slice(0, 120) + '...'
    : props.moment.content
)

const toggleExpand = () => {
  showFullContent.value = !showFullContent.value
}
</script>

<template>
  <div class="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300">
    <!-- 头部：用户信息 -->
    <div class="flex items-start gap-3 mb-3">
      <!-- 头像 -->
      <div 
        class="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 cursor-pointer ring-2 ring-transparent hover:ring-lime-200 transition-all"
        @click.stop="handleUserClick"
      >
        <img 
          v-if="moment.author.avatar" 
          :src="moment.author.avatar" 
          class="w-full h-full object-cover"
        >
        <div v-else class="w-full h-full bg-gradient-to-br from-pink-400 to-orange-400 flex items-center justify-center">
          <i class="fa-solid fa-user text-white text-sm"></i>
        </div>
      </div>

      <!-- 用户信息 -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5">
          <span 
            class="font-semibold text-gray-900 cursor-pointer hover:text-lime-600 transition-colors"
            @click.stop="handleUserClick"
          >
            {{ moment.author.name }}
          </span>
          <i v-if="moment.author.verified" class="fa-solid fa-circle-check text-blue-500 text-xs"></i>
        </div>
        <div class="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
          <span>{{ moment.publishTime }}</span>
          <span v-if="moment.location" class="flex items-center gap-1">
            <i class="fa-solid fa-location-dot text-gray-300"></i>
            {{ moment.location }}
          </span>
        </div>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="mb-3 cursor-pointer" @click="handleClick">
      <p class="text-gray-800 text-[15px] leading-relaxed whitespace-pre-wrap">
        {{ displayContent }}
        <button 
          v-if="shouldTruncate && !showFullContent" 
          class="text-lime-600 text-sm ml-1 hover:underline"
          @click.stop="toggleExpand"
        >
          展开
        </button>
        <button 
          v-else-if="shouldTruncate && showFullContent" 
          class="text-gray-400 text-sm ml-1 hover:underline"
          @click.stop="toggleExpand"
        >
          收起
        </button>
      </p>
    </div>

    <!-- 图片网格 - 每行3个，靠左对齐 -->
    <div v-if="moment.images && moment.images.length > 0" class="mb-3">
      <!-- 单图 -->
      <div v-if="moment.images.length === 1" class="rounded-xl overflow-hidden max-w-[200px]">
        <img 
          :src="moment.images[0]" 
          class="w-full aspect-square object-cover hover:scale-105 transition-transform duration-500 cursor-pointer"
          @click.stop="handleImageClick(0)"
        >
      </div>
      
      <!-- 多图 - 每行3个 -->
      <div v-else class="flex flex-wrap gap-2">
        <div 
          v-for="(img, index) in moment.images" 
          :key="index"
          class="rounded-xl overflow-hidden relative"
          :class="[
            moment.images.length === 2 ? 'w-[calc(50%-4px)]' : 'w-[calc(33.333%-6px)]',
            'aspect-square'
          ]"
        >
          <img 
            :src="img" 
            class="w-full h-full object-cover hover:scale-105 transition-transform duration-500 cursor-pointer"
            @click.stop="handleImageClick(index)"
          >
          <!-- 更多图片指示器 -->
          <div 
            v-if="index === 8 && moment.images.length > 9" 
            class="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-medium text-lg cursor-pointer"
            @click.stop="handleImageClick(index)"
          >
            +{{ moment.images.length - 9 }}
          </div>
        </div>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="flex items-center justify-between pt-3 border-t border-gray-100">
      <div class="flex items-center gap-6">
        <!-- 点赞 -->
        <button 
          class="flex items-center gap-1.5 text-gray-500 hover:text-pink-500 transition-colors group"
          :class="{ 'text-pink-500': isLiked }"
          @click="handleLike"
        >
          <div class="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-pink-50 transition-colors">
            <i :class="isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'" class="text-lg"></i>
          </div>
          <span class="text-sm font-medium">{{ formatNumber(moment.stats.likes) }}</span>
        </button>

        <!-- 评论 -->
        <button 
          class="flex items-center gap-1.5 text-gray-500 hover:text-blue-500 transition-colors group"
          @click="handleComment"
        >
          <div class="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-blue-50 transition-colors">
            <i class="fa-regular fa-comment text-lg"></i>
          </div>
          <span class="text-sm font-medium">{{ formatNumber(moment.stats.comments) }}</span>
        </button>

        <!-- 分享 -->
        <button 
          class="flex items-center gap-1.5 text-gray-500 hover:text-green-500 transition-colors group"
          @click="handleShare"
        >
          <div class="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-green-50 transition-colors">
            <i class="fa-solid fa-share text-lg"></i>
          </div>
          <span class="text-sm font-medium">{{ formatNumber(moment.stats.shares) }}</span>
        </button>
      </div>

      <!-- 更多 -->
      <button class="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
        <i class="fa-solid fa-ellipsis"></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* 图片悬停效果 */
img {
  will-change: transform;
}

/* 展开/收起动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
