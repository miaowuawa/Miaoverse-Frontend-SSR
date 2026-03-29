<script setup lang="ts">
import SidebarLeft from '~/components/container/SidebarLeft.vue'
import SidebarRight from '~/components/container/SidebarRight.vue'
import LoginModal from '~/components/modal/LoginModal.vue'
import SearchModal from '~/components/modal/SearchModal.vue'

useHead({
  title: '活动 - Miaoverse',
})

// 登录和搜索对话框状态
const showLoginModal = ref(false)
const showSearchModal = ref(false)

const handleLogin = () => {
  showLoginModal.value = true
}

const handleSearch = () => {
  showSearchModal.value = true
}

const handleLoginSubmit = (data: { phone: string; code: string }) => {
  console.log('Login submit:', data)
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
</script>

<template>
  <div class="flex min-h-screen bg-bg-light">
    <!-- 左侧边栏 -->
    <SidebarLeft
      @login="handleLogin"
      @search="handleSearch"
    />

    <!-- 中间内容区 -->
    <div class="flex-1 ml-64 mr-80">
      <div class="p-6">
        <h1 class="text-2xl font-bold text-gray-900 mb-6">活动</h1>
        <div class="bg-white rounded-2xl p-8 text-center">
          <i class="fa-solid fa-lightbulb text-6xl text-gray-200 mb-4"></i>
          <p class="text-gray-500">暂无活动</p>
          <p class="text-sm text-gray-400 mt-2">精彩活动即将上线，敬请期待</p>
        </div>
      </div>
    </div>

    <!-- 右侧边栏 -->
    <SidebarRight />

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
