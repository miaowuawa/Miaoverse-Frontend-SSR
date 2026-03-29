<script setup lang="ts">
const menuItems = [
  { id: 'drafts', icon: 'fa-file-lines', label: '我的草稿', count: 0 },
  { id: 'favorites', icon: 'fa-star', label: '我的收藏', count: 0 },
  { id: 'history', icon: 'fa-clock-rotate-left', label: '浏览历史', count: 0 },
  { id: 'wallet', icon: 'fa-wallet', label: '我的钱包', count: 0 },
  { id: 'help', icon: 'fa-circle-question', label: '帮助中心', count: 0 },
]

const emit = defineEmits<{
  (e: 'menu-click', menuId: string): void
}>()

const handleMenuClick = (menuId: string) => {
  emit('menu-click', menuId)
}
</script>

<template>
  <div class="flex-1 p-4">
    <div class="max-w-2xl mx-auto">
      <h2 class="text-xl font-bold text-gray-900 mb-4 px-2">更多</h2>
      <div class="bg-white rounded-2xl overflow-hidden">
        <div
          v-for="(item, index) in menuItems"
          :key="item.id"
          class="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer"
          :class="{ 'border-b border-gray-100': index !== menuItems.length - 1 }"
          @click="handleMenuClick(item.id)"
        >
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <i :class="['fa-solid', item.icon, 'text-gray-600']"></i>
            </div>
            <span class="font-medium text-gray-900">{{ item.label }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span v-if="item.count > 0" class="text-sm text-gray-400">{{ item.count }}</span>
            <i class="fa-solid fa-chevron-right text-gray-300"></i>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
