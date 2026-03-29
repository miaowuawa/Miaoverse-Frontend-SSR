<script setup lang="ts">
import SidebarLeft from '~/components/container/SidebarLeft.vue'
import SidebarRight from '~/components/container/SidebarRight.vue'
import MainContent from '~/components/container/MainContent.vue'
import LoginModal from '~/components/modal/LoginModal.vue'
import SearchModal from '~/components/modal/SearchModal.vue'

useHead({
  title: '推荐 - Miaoverse',
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
      <MainContent />
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
