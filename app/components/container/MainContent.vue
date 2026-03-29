<script setup lang="ts">
import { ref } from 'vue'
import HomeContent from '~/components/content/HomeContent.vue'
import RecommendedUsersContent from '~/components/content/RecommendedUsersContent.vue'
import TopicsContent from '~/components/content/TopicsContent.vue'
import ChannelsContent from '~/components/content/ChannelsContent.vue'
import MoreContent from '~/components/content/MoreContent.vue'
import SettingsContent from '~/components/content/SettingsContent.vue'

// 顶部导航项接口
interface TopNavItem {
  id: string
  icon: string
  label: string
}

const topNavItems: TopNavItem[] = [
  { id: 'home', icon: 'fa-house', label: '首页' },
  { id: 'following', icon: 'fa-user-plus', label: '推荐用户' },
  { id: 'hashtags', icon: 'fa-hashtag', label: '话题' },
  { id: 'channels', icon: 'fa-tv', label: '频道' },
  { id: 'more', icon: 'fa-ellipsis', label: '更多' },
  { id: 'setting', icon: 'fa-gear', label: '设置' },
]

// 当前激活的导航
const activeNav = ref('home')

const emit = defineEmits<{
  (e: 'nav-click', id: string): void
}>()

const handleNavClick = (id: string) => {
  activeNav.value = id
  emit('nav-click', id)
}

// 首页内容事件处理
const handleHomeFollow = (userId: string) => {
  console.log('关注用户:', userId)
}

const handleHomeUnfollow = (userId: string) => {
  console.log('取消关注:', userId)
}

const handleHomeLike = (postId: string) => {
  console.log('点赞:', postId)
}

const handleHomeUnlike = (postId: string) => {
  console.log('取消点赞:', postId)
}

const handleHomeBookmark = (postId: string) => {
  console.log('收藏:', postId)
}

const handleHomeUnbookmark = (postId: string) => {
  console.log('取消收藏:', postId)
}

const handleHomeComment = (postId: string) => {
  console.log('评论:', postId)
}

const handleHomeShare = (postId: string) => {
  console.log('分享:', postId)
}

const handleHomeNotInterested = (postId: string) => {
  console.log('不感兴趣:', postId)
}

const handleHomeReport = (postId: string) => {
  console.log('举报:', postId)
}

const handleHomePostClick = (postId: string) => {
  console.log('点击帖子:', postId)
}

const handleHomeMomentLike = (id: string) => {
  console.log('动态点赞:', id)
}

const handleHomeMomentUnlike = (id: string) => {
  console.log('动态取消点赞:', id)
}

const handleHomeMomentComment = (id: string) => {
  console.log('动态评论:', id)
}

const handleHomeMomentShare = (id: string) => {
  console.log('动态分享:', id)
}

const handleHomeMomentClick = (id: string) => {
  console.log('点击动态:', id)
}

const handleHomeUserClick = (userId: string) => {
  console.log('点击用户:', userId)
}

// 推荐用户事件处理
const handleRecommendedUserFollow = (userId: string) => {
  console.log('关注推荐用户:', userId)
}

const handleRecommendedUserUnfollow = (userId: string) => {
  console.log('取消关注推荐用户:', userId)
}

const handleRecommendedUserClick = (userId: string) => {
  console.log('点击推荐用户:', userId)
}

// 话题事件处理
const handleTopicClick = (topicId: string) => {
  console.log('点击话题:', topicId)
}

// 频道事件处理
const handleChannelClick = (channelId: string) => {
  console.log('点击频道:', channelId)
}

const handleChannelSubscribe = (channelId: string) => {
  console.log('订阅频道:', channelId)
}

// 更多事件处理
const handleMenuClick = (menuId: string) => {
  console.log('点击菜单:', menuId)
}

// 设置事件处理
const handleSettingClick = (settingId: string) => {
  console.log('点击设置:', settingId)
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
          :class="activeNav === item.id ? 'text-lime-500' : 'text-gray-400 hover:text-gray-600'"
          @click="handleNavClick(item.id)"
        >
          <i :class="['fa-solid', item.icon]"></i>
          <span
            v-if="activeNav === item.id"
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

    <!-- 内容区域 -->
    <HomeContent
      v-if="activeNav === 'home'"
      @follow="handleHomeFollow"
      @unfollow="handleHomeUnfollow"
      @like="handleHomeLike"
      @unlike="handleHomeUnlike"
      @bookmark="handleHomeBookmark"
      @unbookmark="handleHomeUnbookmark"
      @comment="handleHomeComment"
      @share="handleHomeShare"
      @not-interested="handleHomeNotInterested"
      @report="handleHomeReport"
      @post-click="handleHomePostClick"
      @moment-like="handleHomeMomentLike"
      @moment-unlike="handleHomeMomentUnlike"
      @moment-comment="handleHomeMomentComment"
      @moment-share="handleHomeMomentShare"
      @moment-click="handleHomeMomentClick"
      @user-click="handleHomeUserClick"
    />

    <RecommendedUsersContent
      v-else-if="activeNav === 'following'"
      @follow="handleRecommendedUserFollow"
      @unfollow="handleRecommendedUserUnfollow"
      @user-click="handleRecommendedUserClick"
    />

    <TopicsContent
      v-else-if="activeNav === 'hashtags'"
      @topic-click="handleTopicClick"
    />

    <ChannelsContent
      v-else-if="activeNav === 'channels'"
      @channel-click="handleChannelClick"
      @subscribe="handleChannelSubscribe"
    />

    <MoreContent
      v-else-if="activeNav === 'more'"
      @menu-click="handleMenuClick"
    />

    <SettingsContent
      v-else-if="activeNav === 'setting'"
      @setting-click="handleSettingClick"
    />
  </main>
</template>
