<script setup lang="ts">
import { ref } from 'vue'
import SidebarLeft from '~/components/container/SidebarLeft.vue'
import MainContent from '~/components/container/MainContent.vue'
import SidebarRight from '~/components/container/SidebarRight.vue'
import LoginModal from '~/components/modal/LoginModal.vue'
import SearchModal from '~/components/modal/SearchModal.vue'

// 页面元数据
useHead({
  title: '首页 - Miaoverse',
})

// 对话框显示状态
const showLoginModal = ref(false)
const showSearchModal = ref(false)

// 导航处理函数
const handleNavigate = (id: string) => {
  console.log('Navigate to:', id)
  // TODO: 实现导航逻辑
}

const handleNavClick = (id: string) => {
  console.log('Top nav clicked:', id)
  // TODO: 实现顶部导航逻辑
}

const handleNotificationClick = (id: string) => {
  console.log('Notification clicked:', id)
  // TODO: 实现通知点击逻辑
}

const handleTrendClick = (id: string) => {
  console.log('Trend clicked:', id)
  // TODO: 实现趋势点击逻辑
}

const handleSettingsClick = () => {
  console.log('Settings clicked')
  // TODO: 打开设置
}

// 登录相关处理
const handleLogin = () => {
  showLoginModal.value = true
}

const handleLoginSubmit = (data: { phone: string; code: string }) => {
  console.log('Login submit:', data)
  // TODO: 调用登录 API
}

const handleQQLogin = () => {
  console.log('QQ login')
  // TODO: 实现 QQ 登录
}

// 搜索相关处理
const handleSearch = () => {
  showSearchModal.value = true
}

const handleSearchSubmit = (keyword: string) => {
  console.log('Search:', keyword)
  // TODO: 执行搜索
}

const handleSearchSelect = (item: any) => {
  console.log('Select:', item)
  // TODO: 处理选中项
}
</script>

<template>
  <div class="flex min-h-screen bg-bg-light">
    <!-- 左侧边栏 -->
    <SidebarLeft
      @navigate="handleNavigate"
      @login="handleLogin"
      @search="handleSearch"
    />

    <!-- 中间内容区 -->
    <div class="flex-1 ml-64 mr-80">
      <MainContent @nav-click="handleNavClick" />
    </div>

    <!-- 右侧边栏 -->
    <SidebarRight
      @notification-click="handleNotificationClick"
      @trend-click="handleTrendClick"
      @settings-click="handleSettingsClick"
    />

    <!-- 登录对话框 -->
    <LoginModal
      v-model:visible="showLoginModal"
      @login="handleLoginSubmit"
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
