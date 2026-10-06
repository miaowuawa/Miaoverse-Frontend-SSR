<script setup lang="ts">
import SidebarLeft from '~/components/container/SidebarLeft.vue'
import SidebarRight from '~/components/container/SidebarRight.vue'
import LoginModal from '~/components/modal/LoginModal.vue'
import SearchModal from '~/components/modal/SearchModal.vue'
import type { MultipleAccountChoice } from '~/types/user'
import type { NotificationCategory, NotificationItemData } from '~/types/notification'
import { categoryMeta, unreadOfCategory } from '~/types/notification'
import { formatAbsoluteTime, formatRelativeTime } from '~/utils/time'

useHead({
  title: '通知 - Miaoverse',
})

const auth = useAuth()
const { currentUser, isLoggedIn } = auth

// 通知共享状态：列表/各分类未读数与 SSE 推送共用一份状态
const { notifications, unread, total, loading, fetchUnread, fetchNotifications, markRead, markAllRead, remove } = useNotifications()

// 登录和搜索对话框状态
const showLoginModal = ref(false)
const showSearchModal = ref(false)
const loginModalRef = ref<InstanceType<typeof LoginModal> | null>(null)

// 分类页签：全部 + 点赞/回复/关注/账号（category 取值对应后端 consts.NotifyCategory*）
const categories: { key: NotificationCategory | ''; label: string }[] = [
  { key: '', label: '全部' },
  { key: 'like', label: '点赞' },
  { key: 'reply', label: '回复' },
  { key: 'follow', label: '关注' },
  { key: 'account', label: '账号' },
]
const activeCategory = ref<NotificationCategory | ''>('')

// 切换分类：按分类向服务端拉取（含分页与未读数刷新）
const handleCategoryChange = (key: NotificationCategory | '') => {
  activeCategory.value = key
  if (isLoggedIn.value) {
    void fetchNotifications(key, { reset: true })
  }
}

// 点击通知：标记已读，并按关联对象跳转（动态 → /moment/:id，用户 → /user/:id）
const handleItemClick = async (item: NotificationItemData) => {
  if (!item.read) {
    await markRead(item.id)
  }
  if (item.target?.kind === 'moment') {
    await navigateTo(`/moment/${item.target.id}`)
  } else if (item.target?.kind === 'user') {
    await navigateTo(`/user/${item.target.id}`)
  }
}

const handleDelete = (item: NotificationItemData) => {
  void remove(item.id)
}

const handleMarkAllRead = () => {
  void markAllRead()
}

const handleLoadMore = () => {
  void fetchNotifications(activeCategory.value)
}

// 登录后拉取通知列表与未读数（SSE 连接由全局 layout 建立）
onMounted(async () => {
  await auth.restoreSession()
  if (isLoggedIn.value) {
    void fetchUnread()
    void fetchNotifications(activeCategory.value, { reset: true })
  }
})

const handleLogin = () => {
  showLoginModal.value = true
}

const handleSearch = () => {
  showSearchModal.value = true
}

const handleLoginSubmit = async (data: { phone: string; region: number; uuid: string; code: number }) => {
  try {
    const result = await auth.loginBySMS(data)

    if (result.type === 'multiple_choices') {
      loginModalRef.value?.openAccountSelector(result.choices)
      return
    }

    showLoginModal.value = false
  } catch (err) {
    loginModalRef.value?.finishLogin(err)
  }
}

const handleAccountSelected = async (choice: MultipleAccountChoice) => {
  try {
    await auth.confirmLoginByChoice(choice)
    showLoginModal.value = false
  } catch (err) {
    loginModalRef.value?.finishLogin(err)
  }
}

const handleQQLogin = () => {
  console.log('QQ login')
}

const handleLogout = async () => {
  await auth.logout()
}

const handleSearchSubmit = (keyword: string) => {
  console.log('Search:', keyword)
}

const handleSearchSelect = (item: any) => {
  console.log('Select:', item)
}
</script>

<template>
  <div class="flex min-h-screen bg-bg-light">
    <!-- 左侧边栏 -->
    <SidebarLeft
      @login="handleLogin"
      @logout="handleLogout"
      @search="handleSearch"
    />

    <!-- 中间内容区 -->
    <div class="flex-1 ml-64" :class="{ 'mr-80': isLoggedIn }">
      <div class="p-6">
        <div class="flex items-center justify-between mb-6 max-w-3xl">
          <h1 class="text-2xl font-bold text-gray-900">通知</h1>
          <button
            v-if="isLoggedIn && unread.total > 0"
            class="text-sm text-lime-600 hover:text-lime-700 transition-colors"
            @click="handleMarkAllRead"
          >
            <i class="fa-solid fa-check-double mr-1"></i>
            全部已读
          </button>
        </div>

        <!-- 分类页签 -->
        <div v-if="isLoggedIn" class="flex items-center gap-2 mb-6 max-w-3xl">
          <button
            v-for="cat in categories"
            :key="cat.key"
            class="px-4 py-1.5 rounded-full text-sm transition-colors flex items-center gap-1.5"
            :class="activeCategory === cat.key
              ? 'bg-lime-500 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100'"
            @click="handleCategoryChange(cat.key)"
          >
            {{ cat.label }}
            <span
              v-if="unreadOfCategory(unread, cat.key) > 0"
              class="min-w-[18px] h-[18px] px-1 rounded-full text-xs flex items-center justify-center"
              :class="activeCategory === cat.key ? 'bg-white text-lime-600' : 'bg-red-500 text-white'"
            >
              {{ unreadOfCategory(unread, cat.key) }}
            </span>
          </button>
        </div>

        <!-- 通知列表 -->
        <div v-if="isLoggedIn && notifications.length > 0" class="space-y-3 max-w-3xl">
          <div
            v-for="item in notifications"
            :key="item.id"
            class="flex items-start gap-3 bg-white rounded-2xl p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            @click="handleItemClick(item)"
          >
            <!-- 分类图标 -->
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              :class="categoryMeta(item.category).color"
            >
              <i :class="['fa-solid', categoryMeta(item.category).icon, 'text-white text-sm']"></i>
            </div>

            <!-- 内容 -->
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 flex items-center gap-2">
                <span class="truncate">{{ item.title }}</span>
                <span v-if="!item.read" class="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
              </p>
              <p v-if="item.content" class="text-sm text-gray-600 mt-1 line-clamp-2 break-all">{{ item.content }}</p>
              <p
                class="text-xs text-gray-400 mt-1"
                :title="formatAbsoluteTime(item.createdAt)"
              >
                {{ formatRelativeTime(item.createdAt) }}
              </p>
            </div>

            <!-- 删除 -->
            <button
              class="w-7 h-7 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
              title="删除通知"
              @click.stop="handleDelete(item)"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <!-- 加载更多 -->
          <div v-if="notifications.length < total" class="text-center pt-2">
            <button
              class="px-6 py-2 rounded-full bg-white text-gray-600 text-sm hover:bg-gray-100 transition-colors disabled:opacity-50"
              :disabled="loading"
              @click="handleLoadMore"
            >
              {{ loading ? '加载中…' : '加载更多' }}
            </button>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else-if="isLoggedIn" class="bg-white rounded-2xl p-12 text-center max-w-3xl">
          <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fa-solid fa-bell text-3xl text-gray-400"></i>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">暂无通知</h3>
          <p class="text-gray-500">
            {{ activeCategory === '' ? '被点赞、被回复、被关注以及账号安全提醒都会出现在这里' : '该分类下暂无通知' }}
          </p>
        </div>

        <!-- 未登录 -->
        <div v-else class="bg-white rounded-2xl p-12 text-center max-w-3xl">
          <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fa-solid fa-bell text-3xl text-gray-400"></i>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">登录后查看通知</h3>
          <p class="text-gray-500 mb-6">点赞、回复、关注与账号安全提醒会实时送达</p>
          <button
            class="px-6 py-2 rounded-full bg-lime-500 text-white hover:bg-lime-600 transition-colors"
            @click="handleLogin"
          >
            登录
          </button>
        </div>
      </div>
    </div>

    <!-- 右侧边栏 -->
    <SidebarRight v-if="isLoggedIn" />

    <!-- 登录对话框 -->
    <LoginModal
      ref="loginModalRef"
      v-model:visible="showLoginModal"
      :current-user="currentUser"
      @login="handleLoginSubmit"
      @select-account="handleAccountSelected"
      @qq-login="handleQQLogin"
    />

    <!-- 搜索对话框 -->
    <SearchModal
      v-model:visible="showSearchModal"
      @search="handleSearchSubmit"
      @select="handleSearchSelect"
    />
  </div>
</template>
