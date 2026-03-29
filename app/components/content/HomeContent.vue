<script setup lang="ts">
import { ref } from 'vue'
import ContentWithImg from '~/components/ContentWithImg.vue'
import Moments from '~/components/Moments.vue'

// 模拟帖子数据
const posts = ref([
  {
    id: '1',
    title: '《春日影》',
    content: '悴んだ心 ふるえる眼差し世界で\n僕は ひとりぼっちだった\n散ることしか知らない春は\n毎年 冷たくあしらう\n\n暗がりの中 一方通行に ただただ\n言葉を書き殴って 期待するだけ......',
    images: ['https://storage.moegirl.org.cn/moegirl/commons/0/00/Haruhikage%28Crychic%29.png'],
    author: {
      id: 'u1',
      name: '高松灯',
      avatar: '',
    },
    publishTime: '2025/3/29 19:26',
    timeLabel: '今天',
    stats: {
      likes: 1680,
      comments: 2499,
      bookmarks: 1000,
    },
    isFollowing: false,
    isLiked: false,
    isBookmarked: false,
  },
])

// 模拟动态数据
const moments = ref([
  {
    id: 'm1',
    content: '昨天的演出真的太棒了！现场的氛围超级好，大家一起唱《春日影》的时候真的很感动。感谢所有来支持的粉丝们！🎸✨\n\n#MyGO #演唱会 #鸡狗对邦',
    images: [
      'https://storage.moegirl.org.cn/moegirl/commons/2/28/BanG_Dream%21_It%27s_MyGO%21%21%21%21%21_01195006.jpg',
      'https://storage.moegirl.org.cn/moegirl/commons/0/00/Haruhikage%28Crychic%29.png',
      'https://storage.moegirl.org.cn/moegirl/commons/0/00/Haruhikage%28Crychic%29.png',
    ],
    author: {
      id: 'u2',
      name: '千早爱音',
      avatar: 'https://storage.moegirl.org.cn/moegirl/commons/d/d2/Chihaya_Anon_icon.png',
      verified: true,
    },
    publishTime: '2025/10/12 21:30',
    location: '上海-梅赛德斯奔驰文化中心',
    stats: {
      likes: 5200,
      comments: 890,
      shares: 2300,
    },
    isLiked: true,
  },
  {
    id: 'm2',
    content: '喵星是什么网站？有猫吗？',
    images: [],
    author: {
      id: 'u3',
      name: '要乐奈',
      avatar: '',
      verified: false,
    },
    publishTime: '2小时前',
    stats: {
      likes: 1200,
      comments: 340,
      shares: 180,
    },
    isLiked: false,
  },
])

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
  (e: 'post-click', postId: string): void
  (e: 'moment-like', id: string): void
  (e: 'moment-unlike', id: string): void
  (e: 'moment-comment', id: string): void
  (e: 'moment-share', id: string): void
  (e: 'moment-click', id: string): void
  (e: 'user-click', userId: string): void
}>()

// 帖子事件处理
const handleFollow = (userId: string) => {
  emit('follow', userId)
}

const handleUnfollow = (userId: string) => {
  emit('unfollow', userId)
}

const handleLike = (postId: string) => {
  emit('like', postId)
}

const handleUnlike = (postId: string) => {
  emit('unlike', postId)
}

const handleBookmark = (postId: string) => {
  emit('bookmark', postId)
}

const handleUnbookmark = (postId: string) => {
  emit('unbookmark', postId)
}

const handleComment = (postId: string) => {
  emit('comment', postId)
}

const handleShare = (postId: string) => {
  emit('share', postId)
}

const handleNotInterested = (postId: string) => {
  emit('not-interested', postId)
  posts.value = posts.value.filter(p => p.id !== postId)
}

const handleReport = (postId: string) => {
  emit('report', postId)
}

const handlePostClick = (postId: string) => {
  emit('post-click', postId)
}

// 动态事件处理
const handleMomentLike = (id: string) => {
  emit('moment-like', id)
}

const handleMomentUnlike = (id: string) => {
  emit('moment-unlike', id)
}

const handleMomentComment = (id: string) => {
  emit('moment-comment', id)
}

const handleMomentShare = (id: string) => {
  emit('moment-share', id)
}

const handleMomentClick = (id: string) => {
  emit('moment-click', id)
}

const handleUserClick = (userId: string) => {
  emit('user-click', userId)
}
</script>

<template>
  <div class="flex-1 p-4">
    <div class="max-w-2xl mx-auto space-y-4">
      <!-- 文章卡片 -->
      <ContentWithImg
        v-for="post in posts"
        :key="post.id"
        :post="post"
        @follow="handleFollow"
        @unfollow="handleUnfollow"
        @like="handleLike"
        @unlike="handleUnlike"
        @bookmark="handleBookmark"
        @unbookmark="handleUnbookmark"
        @comment="handleComment"
        @share="handleShare"
        @not-interested="handleNotInterested"
        @report="handleReport"
        @click="handlePostClick"
      />

      <!-- 动态卡片 -->
      <Moments
        v-for="moment in moments"
        :key="moment.id"
        :moment="moment"
        @like="handleMomentLike"
        @unlike="handleMomentUnlike"
        @comment="handleMomentComment"
        @share="handleMomentShare"
        @click="handleMomentClick"
        @user-click="handleUserClick"
      />
    </div>
  </div>
</template>
