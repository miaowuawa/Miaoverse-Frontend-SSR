<script setup lang="ts">
import { ref } from 'vue'
import ContentWithImg from '~/components/ContentWithImg.vue'
import Moments from '~/components/Moments.vue'

// 顶部导航项接口
interface TopNavItem {
  id: string
  icon: string
  active?: boolean
}

const topNavItems: TopNavItem[] = [
  { id: 'home', icon: 'fa-house', active: true },
  { id: 'following', icon: 'fa-user-plus' },
  { id: 'hashtags', icon: 'fa-hashtag' },
  { id: 'channels', icon: 'fa-tv' },
  { id: 'more', icon: 'fa-ellipsis' },
  { id: 'setting', icon: 'fa-gear' },
]

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
  (e: 'nav-click', id: string): void
}>()

const handleNavClick = (id: string) => {
  emit('nav-click', id)
}

// 帖子事件处理
const handleFollow = (userId: string) => {
  console.log('关注用户:', userId)
}

const handleUnfollow = (userId: string) => {
  console.log('取消关注:', userId)
}

const handleLike = (postId: string) => {
  console.log('点赞:', postId)
}

const handleUnlike = (postId: string) => {
  console.log('取消点赞:', postId)
}

const handleBookmark = (postId: string) => {
  console.log('收藏:', postId)
}

const handleUnbookmark = (postId: string) => {
  console.log('取消收藏:', postId)
}

const handleComment = (postId: string) => {
  console.log('评论:', postId)
}

const handleShare = (postId: string) => {
  console.log('分享:', postId)
}

const handleNotInterested = (postId: string) => {
  console.log('不感兴趣:', postId)
  posts.value = posts.value.filter(p => p.id !== postId)
}

const handleReport = (postId: string) => {
  console.log('举报:', postId)
}

const handlePostClick = (postId: string) => {
  console.log('点击帖子:', postId)
}

// 动态事件处理
const handleMomentLike = (id: string) => {
  console.log('动态点赞:', id)
}

const handleMomentUnlike = (id: string) => {
  console.log('动态取消点赞:', id)
}

const handleMomentComment = (id: string) => {
  console.log('动态评论:', id)
}

const handleMomentShare = (id: string) => {
  console.log('动态分享:', id)
}

const handleMomentClick = (id: string) => {
  console.log('点击动态:', id)
}

const handleUserClick = (userId: string) => {
  console.log('点击用户:', userId)
}
</script>

<template>
  <main class="flex-1 flex flex-col min-h-screen bg-bg-light">
    <!-- 顶部导航栏 -->
    <header class="h-14 bg-white border-b border-gray-200 flex items-center justify-center px-4 sticky top-0 z-10">
      <nav class="flex items-center gap-6">
        <button
          v-for="item in topNavItems"
          :key="item.id"
          class="text-lg transition-colors relative"
          :class="item.active ? 'text-lime-500' : 'text-gray-400 hover:text-gray-600'"
          @click="handleNavClick(item.id)"
        >
          <i :class="['fa-solid', item.icon]"></i>
          <span
            v-if="item.active"
            class="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-lime-500 rounded-full"
          ></span>
        </button>
      </nav>

      <!-- 右侧操作按钮 -->
      <div class="absolute right-4 flex items-center gap-3">
        <button class="text-gray-400 hover:text-gray-600 transition-colors">
          <i class="fa-solid fa-rotate"></i>
        </button>
        <button class="text-gray-400 hover:text-gray-600 transition-colors">
          <i class="fa-solid fa-ellipsis"></i>
        </button>
      </div>
    </header>

    <!-- 内容区域 - 瀑布流 -->
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
  </main>
</template>
