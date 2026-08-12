<script setup lang="ts">
import SidebarLeft from '~/components/container/SidebarLeft.vue'
import SidebarRight from '~/components/container/SidebarRight.vue'
import MainContent from '~/components/container/MainContent.vue'
import LoginModal from '~/components/modal/LoginModal.vue'
import AccountSelectorModal from '~/components/modal/AccountSelectorModal.vue'
import SearchModal from '~/components/modal/SearchModal.vue'
import type { MultipleAccountChoice } from '~/types/user'
import type { MenuItem, ServerMenuPayload } from '~/types/menu'
import { notifyError } from '~/utils/notify'

useHead({
  title: '推荐 - Miaoverse',
})

// 模拟登录态与菜单数据
const auth = useAuth()
const { currentUser, isLoggedIn } = auth

// 登录和搜索对话框状态
const showLoginModal = ref(false)
const showSearchModal = ref(false)

const loginModalRef = ref<InstanceType<typeof LoginModal> | null>(null)

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

const handleSearchSubmit = (keyword: string) => {
  console.log('Search:', keyword)
}

const handleSearchSelect = (item: any) => {
  console.log('Select:', item)
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

// 模拟服务器返回的菜单数据；传 null 则使用默认四项
const serverMenu = ref<ServerMenuPayload | null>({
  items: [
    { id: 'account-settings', label: '账号设置', icon: 'fa-user-gear', action: 'route', route: '/settings/account' },
    { id: 'edit-profile', label: '编辑资料', icon: 'fa-pen', action: 'route', route: '/settings/profile' },
    { id: 'placeholder-1', label: '占位设置项', icon: 'fa-user-gear', action: 'modal' },
    { id: 'placeholder-2', label: '占位设置项', icon: 'fa-user-gear', action: 'modal' },
    { id: 'placeholder-3', label: '占位设置项', icon: 'fa-user-gear', action: 'modal' },
    { id: 'my-account', type: 'widget', widget: 'account' },
    { id: 'switch-account', label: '切换账号', icon: 'fa-right-left', action: 'popper' },
    { id: 'logout', label: '退出登录', icon: 'fa-right-from-bracket', action: 'action' },
  ],
  accounts: currentUser.value ? [{ id: currentUser.value.id, display_name: currentUser.value.displayName, handle: currentUser.value.handle.replace('@', ''), avatar: currentUser.value.avatar }] : [],
  widgetMeta: {
    credits: 2000,
    points: 2100,
    coins: 1000,
    signedIn: false,
    signInIcon: 'fa-gift',
  },
})
</script>

<template>
  <div class="flex min-h-screen bg-bg-light">
    <!-- 左侧边栏 -->
    <SidebarLeft
      :current-user="currentUser"
      :server-menu="serverMenu"
      @login="handleLogin"
      @search="handleSearch"
      @logout="handleLogout"
      @switch-account="handleSwitchAccount"
      @menu-action="handleMenuAction"
      @sign-in="handleSignIn"
    />

    <!-- 中间内容区 -->
    <div class="flex-1 ml-64" :class="{ 'mr-80': isLoggedIn }">
      <MainContent />
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
