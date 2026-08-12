<script setup lang="ts">
import SidebarLeft from '~/components/container/SidebarLeft.vue'
import SidebarRight from '~/components/container/SidebarRight.vue'
import LoginModal from '~/components/modal/LoginModal.vue'
import SearchModal from '~/components/modal/SearchModal.vue'
import type { MultipleAccountChoice } from '~/types/user'

useHead({
  title: '社交 - Miaoverse',
})

// 模拟登录态
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
        <h1 class="text-2xl font-bold text-gray-900 mb-6">社交</h1>
        <div class="glass-card rounded-2xl p-8 text-center">
          <i class="fa-solid fa-user-plus text-6xl text-gray-200 mb-4"></i>
          <p class="text-gray-500">关注请求</p>
          <p class="text-sm text-gray-400 mt-2">暂无新的关注请求</p>
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
