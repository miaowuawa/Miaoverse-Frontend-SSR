<script setup lang="ts">
import { ref, computed } from 'vue'
import { useImageViewer } from '~/composables/useImageViewer'
import AvatarImg from '~/components/AvatarImg.vue'
import CommentItem from '~/components/CommentItem.vue'
import type { CommentItemData } from '~/types/comment'
import { formatAbsoluteTime, formatRelativeTime } from '~/utils/time'

/** 单个表情反应计数 */
export interface ReactionItem {
  emoji: string
  count: number
}

/** 动态详情数据接口（与后端 /moments/:id 对接） */
export interface MomentDetailData {
  id: string
  content: string
  images?: string[]
  author: {
    id: string
    name: string
    handle?: string
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
  reactions?: ReactionItem[]
  isLiked?: boolean
  isFollowing?: boolean
  isSelf?: boolean
}

const props = defineProps<{
  moment: MomentDetailData
  /** 评论列表当前是否处于加载状态 */
  commentsLoading?: boolean
  /** 评论列表（一级评论，含贴纸穿插展示信息） */
  comments?: CommentItemData[]
  /** 评论总数（用于「加载更多」判断） */
  commentsTotal?: number
}>()

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'search'): void
  (e: 'follow', userId: string): void
  (e: 'unfollow', userId: string): void
  (e: 'like', id: string): void
  (e: 'unlike', id: string): void
  (e: 'comment', id: string): void
  (e: 'share', id: string): void
  (e: 'reaction', payload: { id: string; emoji: string }): void
  (e: 'sort-change', sort: 'hot' | 'time'): void
  (e: 'user-click', userId: string): void
  (e: 'like-comment', id: string): void
  (e: 'unlike-comment', id: string): void
  (e: 'load-more-comments'): void
  /** 回复评论/回复他人的回复（楼中楼） */
  (e: 'reply', payload: { rootId: string; targetId: string; targetName: string }): void
  (e: 'like-reply', payload: { rootId: string; replyId: string }): void
  (e: 'unlike-reply', payload: { rootId: string; replyId: string }): void
  /** 展开楼中楼回复 */
  (e: 'expand-replies', rootId: string): void
  /** 查看完整对话（一键加载该链下全部评论回复） */
  (e: 'show-conversation', rootId: string): void
}>()

const { openViewer } = useImageViewer()

const sortBy = ref<'hot' | 'time'>('hot')

const displayHandle = computed(() => {
  const h = props.moment.author.handle
  if (!h) return ''
  return h.startsWith('@') ? h : `@${h}`
})

const formatNumber = (num: number): string => {
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toString()
}

const handleBack = () => emit('back')
const handleSearch = () => emit('search')

const handleFollow = () => {
  if (props.moment.isFollowing) {
    emit('unfollow', props.moment.author.id)
  } else {
    emit('follow', props.moment.author.id)
  }
}

// 点赞：状态由父级（真实接口）驱动，本地不乐观切换，失败时不会出现状态错乱
const handleLike = () => {
  if (props.moment.isLiked) {
    emit('unlike', props.moment.id)
  } else {
    emit('like', props.moment.id)
  }
}

const handleComment = () => emit('comment', props.moment.id)
const handleShare = () => emit('share', props.moment.id)

const handleReaction = (emoji: string) => {
  emit('reaction', { id: props.moment.id, emoji })
}

const handleSortChange = (sort: 'hot' | 'time') => {
  sortBy.value = sort
  emit('sort-change', sort)
}

const handleImageClick = (index: number) => {
  if (props.moment.images && props.moment.images.length > 0) {
    openViewer(props.moment.images, index)
  }
}

const handleUserClick = () => {
  emit('user-click', props.moment.author.id)
}

const handleCommentLike = (id: string) => emit('like-comment', id)
const handleCommentUnlike = (id: string) => emit('unlike-comment', id)
const handleLoadMoreComments = () => emit('load-more-comments')
const handleCommentReply = (payload: { rootId: string; targetId: string; targetName: string }) => emit('reply', payload)
const handleReplyLike = (payload: { rootId: string; replyId: string }) => emit('like-reply', payload)
const handleReplyUnlike = (payload: { rootId: string; replyId: string }) => emit('unlike-reply', payload)
const handleExpandReplies = (rootId: string) => emit('expand-replies', rootId)
const handleShowConversation = (rootId: string) => emit('show-conversation', rootId)

// 是否还有更多评论可加载
const hasMoreComments = computed(() => (props.comments?.length ?? 0) < (props.commentsTotal ?? 0))
</script>

<template>
  <div class="min-h-screen bg-bg-light">
    <!-- 顶部标题栏 -->
    <header class="h-14 bg-white border-b border-gray-200 flex items-center justify-center px-4 sticky top-0 z-10">
      <button
        class="absolute left-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
        @click="handleBack"
      >
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      <h1 class="text-base font-medium text-gray-900">动态</h1>
      <button
        class="absolute right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
        @click="handleSearch"
      >
        <i class="fa-solid fa-magnifying-glass"></i>
      </button>
    </header>

    <!-- 内容区 -->
    <main class="max-w-2xl mx-auto p-4 space-y-4">
      <!-- 动态主体卡片 -->
      <div class="glass-card rounded-2xl p-4">
        <!-- 头部 -->
        <div class="flex items-start gap-3 mb-3">
          <div
            class="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 cursor-pointer ring-2 ring-transparent hover:ring-lime-200 transition-all"
            @click="handleUserClick"
          >
            <AvatarImg
              :avatar-uuid="moment.author.avatar"
              class="w-full h-full"
            ></AvatarImg>
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5">
              <span
                class="font-semibold text-gray-900 cursor-pointer hover:text-lime-600 transition-colors"
                @click="handleUserClick"
              >
                {{ moment.author.name }}
              </span>
              <i v-if="moment.author.verified" class="fa-solid fa-circle-check text-blue-500 text-xs"></i>
            </div>
            <div class="text-sm text-gray-400 mt-0.5">
              {{ displayHandle }}
            </div>
          </div>

          <div class="flex items-center gap-2 flex-shrink-0">
            <button
              v-if="!moment.isSelf"
              class="px-3 py-1 rounded-full text-sm font-medium transition-colors"
              :class="moment.isFollowing
                ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                : 'bg-lime-100 text-lime-700 hover:bg-lime-200'"
              @click="handleFollow"
            >
              <i v-if="!moment.isFollowing" class="fa-solid fa-plus mr-1"></i>
              {{ moment.isFollowing ? '已关注' : '关注' }}
            </button>
            <button class="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <i class="fa-solid fa-bars-staggered"></i>
            </button>
          </div>
        </div>

        <!-- 正文 -->
        <p class="text-gray-800 text-[15px] leading-relaxed whitespace-pre-wrap mb-3">
          {{ moment.content }}
        </p>

        <!-- 图片网格 -->
        <div v-if="moment.images && moment.images.length > 0" class="mb-3">
          <div v-if="moment.images.length === 1" class="rounded-xl overflow-hidden max-w-[240px]">
            <img
              :src="moment.images[0]"
              alt=""
              class="w-full aspect-square object-cover hover:scale-105 transition-transform duration-500 cursor-pointer"
              @click="handleImageClick(0)"
            >
          </div>
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
                alt=""
                class="w-full h-full object-cover hover:scale-105 transition-transform duration-500 cursor-pointer"
                @click="handleImageClick(index)"
              >
              <div
                v-if="index === 8 && moment.images.length > 9"
                class="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-medium text-lg cursor-pointer"
                @click="handleImageClick(index)"
              >
                +{{ moment.images.length - 9 }}
              </div>
            </div>
          </div>
        </div>

        <!-- 时间/地点（人性化时间，悬停显示精确日期时间） -->
        <div class="text-xs text-gray-400 mb-3 flex items-center gap-2">
          <span :title="formatAbsoluteTime(moment.publishTime)">{{ formatRelativeTime(moment.publishTime) }}</span>
          <span v-if="moment.location" class="flex items-center gap-1">
            <i class="fa-solid fa-location-dot text-gray-300"></i>
            {{ moment.location }}
          </span>
        </div>

        <!-- 互动栏 -->
        <div class="flex items-center justify-between pt-3 border-t border-gray-100">
          <div class="flex items-center gap-6">
            <button
              class="flex items-center gap-1.5 text-gray-500 hover:text-pink-500 transition-colors group"
              :class="{ 'text-pink-500': moment.isLiked }"
              @click="handleLike"
            >
              <div class="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-pink-50 transition-colors">
                <i :class="moment.isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'" class="text-lg"></i>
              </div>
              <span class="text-sm font-medium">{{ formatNumber(moment.stats.likes) }}</span>
            </button>

            <button
              class="flex items-center gap-1.5 text-gray-500 hover:text-blue-500 transition-colors group"
              @click="handleComment"
            >
              <div class="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                <i class="fa-regular fa-comment text-lg"></i>
              </div>
              <span class="text-sm font-medium">{{ formatNumber(moment.stats.comments) }}</span>
            </button>

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

          <!-- 表情反应 -->
          <div v-if="moment.reactions && moment.reactions.length > 0" class="flex items-center gap-1.5">
            <button
              v-for="(reaction, index) in moment.reactions"
              :key="index"
              class="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-sm"
              @click="handleReaction(reaction.emoji)"
            >
              <span>{{ reaction.emoji }}</span>
              <span class="text-gray-600">{{ formatNumber(reaction.count) }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 评论区域标题 -->
      <div class="glass-card rounded-2xl px-4 py-3 flex items-center justify-between">
        <h2 class="text-base font-medium text-gray-900">
          评论（{{ formatNumber(moment.stats.comments) }}条）
        </h2>
        <div class="flex items-center text-sm">
          <button
            class="transition-colors"
            :class="sortBy === 'hot' ? 'text-lime-600 font-medium' : 'text-gray-400 hover:text-gray-600'"
            @click="handleSortChange('hot')"
          >
            按热度
          </button>
          <span class="mx-2 text-gray-300">|</span>
          <button
            class="transition-colors"
            :class="sortBy === 'time' ? 'text-lime-600 font-medium' : 'text-gray-400 hover:text-gray-600'"
            @click="handleSortChange('time')"
          >
            按时间
          </button>
        </div>
      </div>

      <!-- 评论区加载占位 -->
      <div v-if="commentsLoading && (!comments || comments.length === 0)" class="glass-card rounded-2xl p-8 flex items-center justify-center">
        <div class="flex items-center gap-2 text-gray-400 text-sm">
          <i class="fa-solid fa-circle-notch fa-spin"></i>
          <span>评论加载中...</span>
        </div>
      </div>

      <!-- 评论列表（贴纸随文字穿插展示；贴纸被封禁时灰字提示） -->
      <template v-else-if="comments && comments.length > 0">
        <CommentItem
          v-for="comment in comments"
          :key="comment.id"
          :comment="comment"
          @like="handleCommentLike"
          @unlike="handleCommentUnlike"
          @user-click="handleUserClick"
          @reply="handleCommentReply"
          @like-reply="handleReplyLike"
          @unlike-reply="handleReplyUnlike"
          @expand-replies="handleExpandReplies"
          @show-conversation="handleShowConversation"
        />

        <div v-if="commentsLoading" class="glass-card rounded-2xl p-4 text-center text-gray-400 text-sm">
          <i class="fa-solid fa-circle-notch fa-spin mr-1"></i>
          加载中...
        </div>
        <button
          v-else-if="hasMoreComments"
          class="glass-card rounded-2xl w-full py-3 text-center text-sm text-gray-500 hover:text-lime-600 transition-colors"
          @click="handleLoadMoreComments"
        >
          加载更多评论
        </button>
      </template>

      <!-- 评论区空位（图标与文字同行等高） -->
      <div v-else class="glass-card rounded-2xl p-8 flex items-center justify-center gap-1.5 text-gray-400 text-sm">
        <i class="fa-regular fa-comment-dots"></i>
        <span>暂无评论，来抢沙发吧～</span>
      </div>
    </main>
  </div>
</template>
