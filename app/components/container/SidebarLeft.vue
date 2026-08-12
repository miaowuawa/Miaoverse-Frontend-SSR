<script setup lang="ts">
import { ref, computed } from 'vue'
import type { CurrentUser } from '~/types/user'
import type { MenuItem, ParsedMenu } from '~/types/menu'
import AccountMenu from '~/components/user/AccountMenu.vue'

// 导航项接口
interface NavItem {
  id: string
  icon: string
  label: string
  path: string
  badge?: number
}

// Props
const props = defineProps<{
  activeItem?: string | null
  currentUser?: CurrentUser | null
  serverMenu?: ParsedMenu | null
}>()

// 登录态兜底：部分页面未传 currentUser prop（如 channels/announcements 等），
// 回退到全局 auth 状态（useState 跨页面共享），保证左侧栏在所有页面
// 都能正确反映登录/未登录，避免登录后或刷新后仍显示"注册 / 登录"。
const auth = useAuth()
const effectiveUser = computed(() => props.currentUser ?? auth.currentUser.value ?? null)
const isLoggedIn = computed(() => !!effectiveUser.value)

// 主导航项
const mainNavItems: NavItem[] = [
  { id: 'timeline', icon: 'fa-star', label: '推荐', path: '/home' },
  { id: 'notifications', icon: 'fa-bell', label: '公告', path: '/notifications', badge: 0 },
  { id: 'notes', icon: 'fa-lightbulb', label: '活动', path: '/notes' },
  { id: 'follow-requests', icon: 'fa-user-plus', label: '社交', path: '/follow-requests' },
  { id: 'messages', icon: 'fa-comments', label: '消息', path: '/messages' },
  { id: 'cloud', icon: 'fa-cloud', label: '网盘', path: '/cloud' },
]

// 发现区域
const discoverItems: NavItem[] = [
  { id: 'discover', icon: 'fa-hashtag', label: '发现', path: '/discover' },
  { id: 'announcements', icon: 'fa-comment', label: '圈子', path: '/announcements' },
  { id: 'channels', icon: 'fa-tv', label: '频道', path: '/channels' },
]

const route = useRoute()
const router = useRouter()
const anchorEl = ref<HTMLElement | null>(null)
const menuVisible = ref(false)

// 判断当前路由是否激活
const isActive = (path: string) => {
  // 如果传入了 activeItem，使用它来判断
  if (props.activeItem !== undefined) {
    return props.activeItem === path
  }
  return route.path === path
}

const emit = defineEmits<{
  (e: 'login'): void
  (e: 'search'): void
  (e: 'logout'): void
  (e: 'switch-account'): void
  (e: 'menu-action', item: MenuItem): void
  (e: 'sign-in'): void
}>()

const handleNavClick = (path: string) => {
  router.push(path)
}

const handleLogin = () => {
  emit('login')
}

const handleSearch = () => {
  emit('search')
}

const toggleMenu = () => {
  menuVisible.value = !menuVisible.value
}

const handleMenuClose = () => {
  menuVisible.value = false
}

const handleLogout = () => {
  emit('logout')
}

const handleSwitchAccount = () => {
  emit('switch-account')
}

const handleMenuAction = (item: MenuItem) => {
  emit('menu-action', item)
  if (item.route) {
    router.push(item.route)
  }
}

const handleSignIn = () => {
  emit('sign-in')
}
</script>

<template>
  <aside class="w-64 h-screen bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0">
    <!-- Logo 区域 -->
    <div class="p-4 flex items-center justify-between">
      <NuxtLink to="/" class="flex items-center gap-2">
        <div class="w-8 h-8 bg-gradient-to-br from-pink-400 to-orange-400 rounded-lg flex items-center justify-center">
          <i class="fa-solid fa-cat text-white text-sm"></i>
        </div>
      </NuxtLink>
      <button class="text-lime-500 hover:text-lime-600 transition-colors" @click="handleSearch">
        <i class="fa-solid fa-magnifying-glass text-sm"></i>
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
          :class="isActive(item.path) ? 'bg-lime-100 text-lime-700' : 'text-gray-600 hover:bg-gray-100'"
          @click="handleNavClick(item.path)"
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
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
          :class="isActive(item.path) ? 'bg-lime-100 text-lime-700' : 'text-gray-600 hover:bg-gray-100'"
          @click="handleNavClick(item.path)"
        >
          <i :class="['fa-solid', item.icon, 'w-5 text-center']"></i>
          <span>{{ item.label }}</span>
        </button>
      </div>
    </nav>

    <!-- 底部区域 -->
    <div class="p-3 border-t border-gray-200">
      <!-- 未登录：注册/登录 -->
      <button
        v-if="!isLoggedIn"
        class="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-100 transition-colors"
        @click="handleLogin"
      >
        <div class="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
          <i class="fa-solid fa-user text-gray-500 text-sm"></i>
        </div>
        <div class="flex-1 text-left">
          <p class="text-sm font-medium text-gray-700">注册 / 登录</p>
          <p class="text-xs text-gray-400">点击开始探索</p>
        </div>
        <i class="fa-solid fa-chevron-right text-gray-400 text-xs"></i>
      </button>

      <!-- 已登录：用户展开菜单 -->
      <button
        v-else
        ref="anchorEl"
        class="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-100 transition-colors"
        :class="{ 'bg-lime-50': menuVisible }"
        @click="toggleMenu"
      >
        <div class="w-9 h-9 rounded-full bg-gradient-to-br from-lime-400 to-lime-500 flex items-center justify-center flex-shrink-0">
          <i class="fa-solid fa-user text-white text-sm"></i>
        </div>
        <div class="flex-1 text-left min-w-0">
          <p class="text-sm font-medium text-gray-800 truncate">{{ effectiveUser?.displayName || '用户' }}</p>
          <p class="text-xs text-gray-400 truncate">{{ effectiveUser?.handle || '' }}</p>
        </div>
        <i
          :class="['fa-solid text-gray-500 text-xs transition-transform duration-200', menuVisible ? 'fa-chevron-up rotate-0' : 'fa-chevron-down']"
        ></i>
      </button>
    </div>
  </aside>

  <AccountMenu
    v-model:visible="menuVisible"
    :current-user="effectiveUser"
    :server-menu="serverMenu"
    :anchor-el="anchorEl ?? undefined"
    @close="handleMenuClose"
    @logout="handleLogout"
    @switch-account="handleSwitchAccount"
    @menu-action="handleMenuAction"
    @sign-in="handleSignIn"
  />
</template>
