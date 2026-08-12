<script setup lang="ts">
import { ref } from 'vue'
import SidebarLeft from '~/components/container/SidebarLeft.vue'
import MainContent from '~/components/container/MainContent.vue'
import SidebarRight from '~/components/container/SidebarRight.vue'
import LoginModal from '~/components/modal/LoginModal.vue'
import AccountSelectorModal from '~/components/modal/AccountSelectorModal.vue'
import SearchModal from '~/components/modal/SearchModal.vue'
import type { MultipleAccountChoice } from '~/types/user'
import type { MenuItem, ServerMenuPayload } from '~/types/menu'
import { notifyError } from '~/utils/notify'

// 页面元数据
useHead({
  title: '首页 - Miaoverse',
})

// 模拟登录态
const auth = useAuth()
const { currentUser, isLoggedIn } = auth

// 对话框显示状态
const showLoginModal = ref(false)
const showSearchModal = ref(false)

// 导航处理函数
const handleNavigate = (id: string) => {
  console.log('Navigate to:', id)
}

const handleNavClick = (id: string) => {
  console.log('Top nav clicked:', id)
}

const handleNotificationClick = (id: string) => {
  console.log('Notification clicked:', id)
}

const handleTrendClick = (id: string) => {
  console.log('Trend clicked:', id)
}

const handleSettingsClick = () => {
  console.log('Settings clicked')
}

const loginModalRef = ref<InstanceType<typeof LoginModal> | null>(null)

// 登录相关处理
const handleLogin = () => {
  showLoginModal.value = true
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

// 切换账号：弹出账号选择窗口，列表与切换均走后端接口
const showSwitchAccountModal = ref(false)
const switchAccountChoices = ref<MultipleAccountChoice[]>([])

const handleSwitchAccount = async () => {
  showSwitchAccountModal.value = true
  switchAccountChoices.value = []
  try {
    switchAccountChoices.value = await auth.fetchMyAccounts()
  } catch (err) {
    notifyError(err, '获取账号列表失败，请稍后重试')
  }
}

const handleSwitchAccountConfirm = async (choice: MultipleAccountChoice) => {
  try {
    await auth.switchAccount(choice)
    showSwitchAccountModal.value = false
  } catch (err) {
    notifyError(err, '切换账号失败，请稍后重试')
  }
}

const handleQQLogin = () => {
  console.log('QQ login')
}

const handleLogout = async () => {
  await auth.logout()
}

const handleMenuAction = (item: MenuItem) => {
  if (item.route) {
    navigateTo(item.route)
  }
}

const handleSignIn = () => {
  console.log('签到')
}

// 搜索相关处理
const handleSearch = () => {
  showSearchModal.value = true
}

const handleSearchSubmit = (keyword: string) => {
  console.log('Search:', keyword)
}

const handleSearchSelect = (item: any) => {
  console.log('Select:', item)
}

// 默认菜单：不传 serverMenu 时组件内部也会使用默认四项
const serverMenu = ref<ServerMenuPayload | null>(null)
</script>

<template>
  <div class="flex min-h-screen bg-bg-light">
    <!-- 左侧边栏 -->
    <SidebarLeft
      :current-user="currentUser"
      :server-menu="serverMenu"
      @navigate="handleNavigate"
      @login="handleLogin"
      @search="handleSearch"
      @logout="handleLogout"
      @switch-account="handleSwitchAccount"
      @menu-action="handleMenuAction"
      @sign-in="handleSignIn"
    />

    <!-- 中间内容区 -->
    <div class="flex-1 ml-64" :class="{ 'mr-80': isLoggedIn }">
      <MainContent @nav-click="handleNavClick" />
    </div>

    <!-- 右侧边栏（仅登录后显示） -->
    <SidebarRight
      v-if="isLoggedIn"
      @notification-click="handleNotificationClick"
      @trend-click="handleTrendClick"
      @settings-click="handleSettingsClick"
    />

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

    <!-- 切换账号选择窗口 -->
    <AccountSelectorModal
      v-model:visible="showSwitchAccountModal"
      mode="switch"
      :phone="currentUser?.handle ?? ''"
      :choices="switchAccountChoices"
      :current-user="currentUser"
      @confirm="handleSwitchAccountConfirm"
    />
  </div>
</template>
