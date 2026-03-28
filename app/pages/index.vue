<script setup lang="ts">
// 页面元数据
useHead({
  title: '首页 - Miaoverse',
})

// 导航处理函数
const handleNavigate = (id: string) => {
  console.log('Navigate to:', id)
  // TODO: 实现导航逻辑
}

const handlePost = () => {
  console.log('Open post modal')
  // TODO: 打开发帖弹窗
}

const handleSwitchAccount = () => {
  console.log('Switch account')
  // TODO: 实现切换账号逻辑
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
</script>

<template>
  <div class="flex min-h-screen bg-bg-light">
    <!-- 左侧边栏 -->
    <SidebarLeft
      @navigate="handleNavigate"
      @post="handlePost"
      @switch-account="handleSwitchAccount"
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
  </div>
</template>
