<script setup lang="ts">
// 导航项接口，预留未来扩展
interface NavItem {
  id: string
  icon: string
  label: string
  active?: boolean
  badge?: number
}

// 主导航项
const mainNavItems: NavItem[] = [
  { id: 'timeline', icon: 'fa-clock', label: '时间线', active: true },
  { id: 'notifications', icon: 'fa-bell', label: '通知', badge: 0 },
  { id: 'notes', icon: 'fa-note-sticky', label: '便签' },
  { id: 'cloud', icon: 'fa-cloud', label: '网盘' },
  { id: 'follow-requests', icon: 'fa-user-plus', label: '关注请求' },
  { id: 'messages', icon: 'fa-comments', label: '消息' },
]

// 发现区域
const discoverItems: NavItem[] = [
  { id: 'discover', icon: 'fa-hashtag', label: '发现' },
  { id: 'announcements', icon: 'fa-bullhorn', label: '公告' },
  { id: 'channels', icon: 'fa-tv', label: '频道' },
  { id: 'search', icon: 'fa-magnifying-glass', label: '搜索' },
]

// 用户数据接口
interface UserInfo {
  id: string
  username: string
  displayName: string
  avatar?: string
}

const currentUser: UserInfo = {
  id: '1',
  username: 'miaowuawa',
  displayName: '@miaowuawa',
}

const emit = defineEmits<{
  (e: 'navigate', id: string): void
  (e: 'post'): void
  (e: 'switch-account'): void
}>()

const handleNavClick = (id: string) => {
  emit('navigate', id)
}

const handlePost = () => {
  emit('post')
}

const handleSwitchAccount = () => {
  emit('switch-account')
}
</script>

<template>
  <aside class="w-64 h-screen bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0">
    <!-- Logo 区域 -->
    <div class="p-4 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 bg-gradient-to-br from-pink-400 to-orange-400 rounded-lg flex items-center justify-center">
          <i class="fa-solid fa-cat text-white text-sm"></i>
        </div>
      </div>
      <button class="text-lime-500 hover:text-lime-600 transition-colors">
        <i class="fa-solid fa-bolt"></i>
      </button>
    </div>

    <!-- 主导航 -->
    <nav class="flex-1 overflow-y-auto px-3">
      <!-- 主要菜单 -->
      <div class="space-y-1">
        <button
          v-for="item in mainNavItems"
          :key="item.id"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
          :class="item.active ? 'bg-lime-100 text-lime-700' : 'text-gray-600 hover:bg-gray-100'"
          @click="handleNavClick(item.id)"
        >
          <i :class="['fa-solid', item.icon, 'w-5 text-center']"></i>
          <span>{{ item.label }}</span>
          <span
            v-if="item.badge && item.badge > 0"
            class="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center"
          >
            {{ item.badge }}
          </span>
        </button>
      </div>

      <!-- 分隔线 -->
      <div class="my-4 border-t border-gray-200"></div>

      <!-- 发现区域 -->
      <div class="space-y-1">
        <button
          v-for="item in discoverItems"
          :key="item.id"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
          @click="handleNavClick(item.id)"
        >
          <i :class="['fa-solid', item.icon, 'w-5 text-center']"></i>
          <span>{{ item.label }}</span>
        </button>
      </div>

      <!-- 分隔线 -->
      <div class="my-4 border-t border-gray-200"></div>

      <!-- 切换账号 -->
      <button
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
        @click="handleSwitchAccount"
      >
        <i class="fa-solid fa-right-left w-5 text-center"></i>
        <span>切换账号</span>
      </button>
    </nav>

    <!-- 底部操作区 -->
    <div class="p-3 border-t border-gray-200 space-y-3">
      <!-- 发帖按钮 -->
      <button
        class="w-full bg-lime-500 hover:bg-lime-600 text-white font-medium py-2.5 px-4 rounded-full flex items-center justify-center gap-2 transition-colors"
        @click="handlePost"
      >
        <i class="fa-solid fa-pen-to-square"></i>
        <span>发帖</span>
      </button>

      <!-- 用户信息 -->
      <div class="flex items-center gap-3 px-2">
        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 flex items-center justify-center overflow-hidden">
          <img
            v-if="currentUser.avatar"
            :src="currentUser.avatar"
            :alt="currentUser.displayName"
            class="w-full h-full object-cover"
          />
          <i v-else class="fa-solid fa-user text-white text-sm"></i>
        </div>
        <span class="text-sm text-gray-700 font-medium">{{ currentUser.displayName }}</span>
      </div>
    </div>
  </aside>
</template>
