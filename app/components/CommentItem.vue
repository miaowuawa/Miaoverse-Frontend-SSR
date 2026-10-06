<script setup lang="ts">
// 评论条目：头像 + 昵称/账号 + 正文（多张贴纸随文字穿插展示）+ 时间/点赞/回复 + 楼中楼回复链。
// 楼中楼：支持回复一级评论、回复他人的回复；「查看完整对话」一键展开该链下全部评论回复。
// 时间人性化展示（刚刚/x分钟前/…），悬停 title 显示精确日期时间。
// 安全：文本一律 Vue 文本插值渲染（自动 HTML 转义），禁止 v-html；贴纸由 CommentContent 以 <img> 安全渲染。
import { computed, ref } from 'vue'
import AvatarImg from '~/components/AvatarImg.vue'
import CommentContent from '~/components/CommentContent.vue'
import type { CommentItemData, ReplyItemData } from '~/types/comment'
import { formatAbsoluteTime, formatRelativeTime } from '~/utils/time'

const props = defineProps<{
  comment: CommentItemData
}>()

const emit = defineEmits<{
  (e: 'like', id: string): void
  (e: 'unlike', id: string): void
  (e: 'user-click', userId: string): void
  /** 回复评论/回复：targetId 为被回复的评论（或楼中楼内回复）id */
  (e: 'reply', payload: { rootId: string; targetId: string; targetName: string }): void
  (e: 'like-reply', payload: { rootId: string; replyId: string }): void
  (e: 'unlike-reply', payload: { rootId: string; replyId: string }): void
  /** 展开楼中楼（首次加载前若干条回复） */
  (e: 'expand-replies', rootId: string): void
  /** 查看完整对话（一键加载该链下全部评论回复） */
  (e: 'show-conversation', rootId: string): void
}>()

// 楼中楼是否展开（数据在 comment.replies 中，此处只控制可见性）
const threadVisible = ref(false)

const displayHandle = computed(() => {
  const h = props.comment.author.handle
  if (!h) return ''
  return h.startsWith('@') ? h : `@${h}`
})

const formatNumber = (num: number): string => {
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toString()
}

// 楼中楼回复的「回复 @某人」：被回复对象是楼中楼内其他回复时展示（回复首条评论时不展示）
function replyTargetName(reply: ReplyItemData): string {
  if (!reply.replyToId || reply.replyToId === props.comment.id) return ''
  const target = props.comment.replies?.find((r) => r.id === reply.replyToId)
  return target?.author.name || ''
}

// 是否还有未加载的回复（用于「查看完整对话」入口）
const hasMoreReplies = computed(
  () => (props.comment.replies?.length ?? 0) < props.comment.replyCount
)

const handleLike = () => {
  if (props.comment.isLiked) {
    emit('unlike', props.comment.id)
  } else {
    emit('like', props.comment.id)
  }
}

const handleUserClick = () => emit('user-click', props.comment.author.id)

const handleReplyToComment = () => {
  emit('reply', {
    rootId: props.comment.id,
    targetId: props.comment.id,
    targetName: props.comment.author.name,
  })
}

const handleReplyToReply = (reply: ReplyItemData) => {
  emit('reply', {
    rootId: props.comment.id,
    targetId: reply.id,
    targetName: reply.author.name,
  })
}

const handleReplyLike = (reply: ReplyItemData) => {
  if (reply.isLiked) {
    emit('unlike-reply', { rootId: props.comment.id, replyId: reply.id })
  } else {
    emit('like-reply', { rootId: props.comment.id, replyId: reply.id })
  }
}

// 展开/收起楼中楼；首次展开时触发加载
const toggleThread = () => {
  if (!threadVisible.value && props.comment.replies === null) {
    emit('expand-replies', props.comment.id)
  }
  threadVisible.value = !threadVisible.value
}

const handleShowConversation = () => emit('show-conversation', props.comment.id)
</script>

<template>
  <div class="glass-card rounded-2xl p-4">
    <div class="flex items-start gap-3">
      <!-- 头像 -->
      <div
        class="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 cursor-pointer ring-2 ring-transparent hover:ring-lime-200 transition-all"
        @click="handleUserClick"
      >
        <AvatarImg :avatar-uuid="comment.author.avatar" class="w-full h-full"></AvatarImg>
      </div>

      <div class="flex-1 min-w-0">
        <!-- 昵称 + 账号 -->
        <div class="flex items-center gap-2">
          <span
            class="font-semibold text-gray-900 text-[15px] cursor-pointer hover:text-lime-600 transition-colors truncate"
            @click="handleUserClick"
          >
            {{ comment.author.name }}
          </span>
          <span v-if="displayHandle" class="text-sm text-gray-400 truncate">{{ displayHandle }}</span>
        </div>

        <!-- 正文（多张贴纸随文字穿插展示，贴纸缩小内联显示） -->
        <div class="mt-1">
          <CommentContent :content="comment.content" :stickers="comment.stickers" />
        </div>

        <!-- 时间 + 点赞 + 回复 + 楼中楼入口 -->
        <div class="mt-2 flex items-center gap-4 text-xs text-gray-400">
          <span :title="formatAbsoluteTime(comment.createdAt)">{{ formatRelativeTime(comment.createdAt) }}</span>
          <button
            class="flex items-center gap-1.5 transition-colors"
            :class="comment.isLiked ? 'text-pink-500' : 'hover:text-pink-500'"
            @click="handleLike"
          >
            <i :class="comment.isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'"></i>
            <span>{{ formatNumber(comment.likes) }}</span>
          </button>
          <button class="hover:text-lime-600 transition-colors" @click="handleReplyToComment">回复</button>
          <button
            v-if="comment.replyCount > 0"
            class="hover:text-lime-600 transition-colors"
            @click="toggleThread"
          >
            <i :class="threadVisible ? 'fa-solid fa-angle-up' : 'fa-solid fa-angle-down'"></i>
            <span>{{ threadVisible ? '收起回复' : `共 ${formatNumber(comment.replyCount)} 条回复` }}</span>
          </button>
        </div>

        <!-- 楼中楼回复链 -->
        <div v-if="threadVisible" class="mt-3 rounded-xl bg-gray-50/80 border border-gray-100 px-3 py-2 space-y-2.5">
          <!-- 加载占位 -->
          <div v-if="comment.repliesLoading && !comment.replies" class="flex items-center gap-2 text-gray-400 text-xs py-1">
            <i class="fa-solid fa-circle-notch fa-spin"></i>
            <span>回复加载中...</span>
          </div>

          <template v-else>
            <div v-for="reply in comment.replies ?? []" :key="reply.id" class="flex items-start gap-2">
              <!-- 回复者头像 -->
              <div
                class="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 cursor-pointer ring-1 ring-transparent hover:ring-lime-200 transition-all"
                @click="emit('user-click', reply.author.id)"
              >
                <AvatarImg :avatar-uuid="reply.author.avatar" class="w-full h-full"></AvatarImg>
              </div>

              <div class="flex-1 min-w-0">
                <!-- 昵称 + 回复 @某人（回复他人的回复时展示） -->
                <div class="text-[13px] leading-snug">
                  <span
                    class="font-medium text-gray-800 cursor-pointer hover:text-lime-600 transition-colors"
                    @click="emit('user-click', reply.author.id)"
                  >
                    {{ reply.author.name }}
                  </span>
                  <template v-if="replyTargetName(reply)">
                    <span class="text-gray-400"> 回复 </span>
                    <span class="text-lime-600">@{{ replyTargetName(reply) }}</span>
                  </template>
                </div>

                <!-- 回复正文（贴纸随文字穿插展示） -->
                <CommentContent :content="reply.content" :stickers="reply.stickers" compact />

                <!-- 回复时间 + 点赞 + 回复 -->
                <div class="mt-1 flex items-center gap-3 text-xs text-gray-400">
                  <span :title="formatAbsoluteTime(reply.createdAt)">{{ formatRelativeTime(reply.createdAt) }}</span>
                  <button
                    class="flex items-center gap-1 transition-colors"
                    :class="reply.isLiked ? 'text-pink-500' : 'hover:text-pink-500'"
                    @click="handleReplyLike(reply)"
                  >
                    <i :class="reply.isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'"></i>
                    <span>{{ formatNumber(reply.likes) }}</span>
                  </button>
                  <button class="hover:text-lime-600 transition-colors" @click="handleReplyToReply(reply)">回复</button>
                </div>
              </div>
            </div>

            <!-- 加载更多（增量加载中） -->
            <div v-if="comment.repliesLoading && comment.replies" class="flex items-center gap-2 text-gray-400 text-xs py-1">
              <i class="fa-solid fa-circle-notch fa-spin"></i>
              <span>加载中...</span>
            </div>

            <!-- 查看完整对话：一键展开该链下全部评论回复 -->
            <button
              v-else-if="hasMoreReplies"
              class="w-full text-center text-xs text-lime-600 hover:text-lime-700 font-medium py-1 transition-colors"
              @click="handleShowConversation"
            >
              <i class="fa-regular fa-comments mr-1"></i>
              查看完整对话（共 {{ formatNumber(comment.replyCount) }} 条回复）
            </button>
            <div v-else class="text-center text-xs text-gray-400 py-0.5">已显示全部 {{ comment.replies?.length ?? 0 }} 条回复</div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
