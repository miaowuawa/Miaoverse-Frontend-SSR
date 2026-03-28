<script setup lang="ts">
// 顶部导航项接口
interface TopNavItem {
  id: string
  icon: string
  active?: boolean
}

const topNavItems: TopNavItem[] = [
  { id: 'home', icon: 'fa-house', active: true },
  { id: 'search', icon: 'fa-magnifying-glass' },
  { id: 'notifications', icon: 'fa-bell' },
  { id: 'settings', icon: 'fa-gear' },
  { id: 'menu', icon: 'fa-bars' },
  { id: 'more', icon: 'fa-ellipsis' },
]

// 空状态配置
interface EmptyState {
  icon: string
  message: string
}

const emptyState: EmptyState = {
  icon: 'fa-circle-info',
  message: '没有帖文',
}

const emit = defineEmits<{
  (e: 'nav-click', id: string): void
}>()

const handleNavClick = (id: string) => {
  emit('nav-click', id)
}
</script>

<template>
  <main class="flex-1 flex flex-col min-h-screen bg-bg-light">
    <!-- 顶部导航栏 -->
    <header class="h-14 bg-white border-b border-gray-200 flex items-center justify-center px-4 sticky top-0 z-10">
      <nav class="flex items-center gap-6">
        <button
          v-for="item in topNavItems"
          :key="item.id"
          class="text-lg transition-colors relative"
          :class="item.active ? 'text-lime-500' : 'text-gray-400 hover:text-gray-600'"
          @click="handleNavClick(item.id)"
        >
          <i :class="['fa-solid', item.icon]"></i>
          <span
            v-if="item.active"
            class="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-lime-500 rounded-full"
          ></span>
        </button>
      </nav>

      <!-- 右侧操作按钮 -->
      <div class="absolute right-4 flex items-center gap-3">
        <button class="text-gray-400 hover:text-gray-600 transition-colors">
          <i class="fa-solid fa-rotate"></i>
        </button>
        <button class="text-gray-400 hover:text-gray-600 transition-colors">
          <i class="fa-solid fa-ellipsis"></i>
        </button>
      </div>
    </header>

    <!-- 内容区域 -->
    <div class="flex-1 flex items-center justify-center">
      <!-- 空状态 -->
      <div class="text-center">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-lime-500 flex items-center justify-center">
          <i :class="['fa-solid', emptyState.icon, 'text-2xl text-lime-500']"></i>
        </div>
        <p class="text-gray-500 text-sm">{{ emptyState.message }}</p>
      </div>
    </div>
  </main>
</template>
