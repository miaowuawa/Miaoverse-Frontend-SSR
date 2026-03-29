<script setup lang="ts">
import { ref } from 'vue'
import { useImageViewer } from '~/composables/useImageViewer'

// 帖子数据接口
interface PostData {
  id: string
  title: string
  content: string
  images: string[]
  author: {
    id: string
    name: string
    avatar?: string
  }
  publishTime: string
  timeLabel: string
  stats: {
    likes: number
    comments: number
    bookmarks: number
  }
  isFollowing?: boolean
  isLiked?: boolean
  isBookmarked?: boolean
}

const props = defineProps<{
  post: PostData
}>()

const emit = defineEmits<{
  (e: 'follow', userId: string): void
  (e: 'unfollow', userId: string): void
  (e: 'like', postId: string): void
  (e: 'unlike', postId: string): void
  (e: 'bookmark', postId: string): void
  (e: 'unbookmark', postId: string): void
  (e: 'comment', postId: string): void
  (e: 'share', postId: string): void
  (e: 'not-interested', postId: string): void
  (e: 'report', postId: string): void
  (e: 'click', postId: string): void
}>()

// 图片预览
const { openViewer } = useImageViewer()

// 本地状态
const isFollowing = ref(props.post.isFollowing || false)
const isLiked = ref(props.post.isLiked || false)
const isBookmarked = ref(props.post.isBookmarked || false)
const showMenu = ref(false)

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

// 处理关注
const handleFollow = () => {
  isFollowing.value = !isFollowing.value
  if (isFollowing.value) {
    emit('follow', props.post.author.id)
  } else {
    emit('unfollow', props.post.author.id)
  }
}

// 处理点赞
const handleLike = () => {
  isLiked.value = !isLiked.value
  if (isLiked.value) {
    emit('like', props.post.id)
  } else {
    emit('unlike', props.post.id)
  }
}

// 处理收藏
const handleBookmark = () => {
  isBookmarked.value = !isBookmarked.value
  if (isBookmarked.value) {
    emit('bookmark', props.post.id)
  } else {
    emit('unbookmark', props.post.id)
  }
}

// 处理评论
const handleComment = () => {
  emit('comment', props.post.id)
}

// 处理分享
const handleShare = () => {
  emit('share', props.post.id)
}

// 处理不感兴趣
const handleNotInterested = () => {
  showMenu.value = false
  emit('not-interested', props.post.id)
}

// 处理举报
const handleReport = () => {
  showMenu.value = false
  emit('report', props.post.id)
}

// 点击卡片
const handleClick = () => {
  emit('click', props.post.id)
}

// 点击图片预览
const handleImageClick = () => {
  if (props.post.images && props.post.images.length > 0) {
    openViewer(props.post.images, 0)
  }
}

// 点击外部关闭菜单
const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.menu-container')) {
    showMenu.value = false
  }
}

// 监听点击外部
if (typeof window !== 'undefined') {
  window.addEventListener('click', handleClickOutside)
}
</script>

<template>
  <div class="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer" @click="handleClick">
    <!-- 头部：标题和菜单 -->
    <div class="flex items-start justify-between mb-3">
      <h3 class="text-lg font-bold text-gray-900 line-clamp-1 flex-1 pr-4">{{ post.title }}</h3>
      
      <!-- 更多菜单 -->
      <div class="menu-container relative">
        <button 
          class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          @click.stop="showMenu = !showMenu"
        >
          <i class="fa-solid fa-ellipsis text-lg"></i>
        </button>
        
        <!-- 下拉菜单 -->
        <Transition name="fade">
          <div v-if="showMenu" class="absolute right-0 top-10 bg-white rounded-xl shadow-lg border border-gray-100 py-2 min-w-[140px] z-10">
            <button 
              class="w-full px-4 py-2.5 text-left text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2"
              @click.stop="handleNotInterested"
            >
              <i class="fa-regular fa-eye-slash text-gray-400"></i>
              不感兴趣
            </button>
            <button 
              class="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
              @click.stop="handleReport"
            >
              <i class="fa-solid fa-triangle-exclamation"></i>
              举报
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="flex gap-4">
      <!-- 左侧：文字内容 -->
      <div class="flex-1 min-w-0">
        <p class="text-gray-600 text-sm leading-relaxed line-clamp-4 whitespace-pre-line">{{ post.content }}</p>
      </div>

      <!-- 右侧：图片 -->
      <div v-if="post.images && post.images.length > 0" class="flex-shrink-0">
        <div 
          class="relative w-32 h-32 rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
          @click.stop="handleImageClick"
        >
          <img 
            :src="post.images[0]" 
            :alt="post.title"
            class="w-full h-full object-cover"
          >
          <!-- 更多图片指示器 -->
          <div v-if="post.images.length > 1" class="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
            +{{ post.images.length - 1 }}
          </div>
        </div>
      </div>
    </div>

    <!-- 底部：作者信息和操作栏 -->
    <div class="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
      <!-- 左侧：作者信息 -->
      <div class="flex items-center gap-2">
        <!-- 作者头像 -->
        <div class="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 flex items-center justify-center overflow-hidden">
          <img v-if="post.author.avatar" :src="post.author.avatar" class="w-full h-full object-cover">
          <i v-else class="fa-solid fa-user text-white text-xs"></i>
        </div>
        
        <!-- 作者名 -->
        <span class="text-sm text-gray-700 font-medium">{{ post.author.name }}</span>
        
        <!-- 关注按钮 -->
        <button 
          v-if="!isFollowing"
          class="px-3 py-1 bg-lime-500 hover:bg-lime-600 text-white text-xs rounded-full transition-colors"
          @click.stop="handleFollow"
        >
          + 关注
        </button>
        <button 
          v-else
          class="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs rounded-full transition-colors"
          @click.stop="handleFollow"
        >
          已关注
        </button>
        
        <!-- 时间 -->
        <span class="text-xs text-gray-400 ml-2">{{ post.publishTime }} ({{ post.timeLabel }})</span>
      </div>

      <!-- 右侧：操作按钮 -->
      <div class="flex items-center gap-4">
        <!-- 收藏 -->
        <button 
          class="flex items-center gap-1 text-gray-500 hover:text-lime-500 transition-colors"
          :class="{ 'text-lime-500': isBookmarked }"
          @click.stop="handleBookmark"
        >
          <i :class="isBookmarked ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark'"></i>
        </button>

        <!-- 点赞 -->
        <button 
          class="flex items-center gap-1 text-gray-500 hover:text-pink-500 transition-colors"
          :class="{ 'text-pink-500': isLiked }"
          @click.stop="handleLike"
        >
          <i :class="isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'"></i>
          <span class="text-sm">{{ formatNumber(post.stats.likes) }}</span>
        </button>

        <!-- 评论 -->
        <button 
          class="flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors"
          @click.stop="handleComment"
        >
          <i class="fa-solid fa-comment-dots"></i>
          <span class="text-sm">{{ formatNumber(post.stats.comments) }}</span>
        </button>

        <!-- 分享 -->
        <button 
          class="flex items-center gap-1 text-gray-500 hover:text-green-500 transition-colors"
          @click.stop="handleShare"
        >
          <i class="fa-solid fa-share-nodes"></i>
          <span class="text-sm">{{ formatNumber(post.stats.bookmarks) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 菜单动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
