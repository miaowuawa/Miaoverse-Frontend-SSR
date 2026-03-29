<script setup lang="ts">
const settingGroups = [
  {
    title: '算法设置',
    items: [
      { id: 'profile', icon: 'fa-user', label: '个人画像' },
      { id: 'privacy', icon: 'fa-lock', label: '隐私设置' },
      { id: 'security', icon: 'fa-shield-halved', label: '安全' },
    ],
  },
  {
    title: '通用设置',
    items: [
      { id: 'notifications', icon: 'fa-bell', label: '新内容通知' },
      { id: 'display', icon: 'fa-filter', label: '屏蔽设置' },
      { id: 'language', icon: 'fa-language', label: '语言选项' },
    ],
  },
]

const emit = defineEmits<{
  (e: 'setting-click', settingId: string): void
}>()

const handleSettingClick = (settingId: string) => {
  emit('setting-click', settingId)
}
</script>

<template>
  <div class="flex-1 p-4">
    <div class="max-w-2xl mx-auto">
      <h2 class="text-xl font-bold text-gray-900 mb-4 px-2">内容推荐设置</h2>
      <div class="space-y-4">
        <div
          v-for="group in settingGroups"
          :key="group.title"
          class="bg-white rounded-2xl overflow-hidden"
        >
          <h3 class="text-sm font-medium text-gray-400 px-4 py-3">{{ group.title }}</h3>
          <div
            v-for="(item, index) in group.items"
            :key="item.id"
            class="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer"
            :class="{ 'border-t border-gray-100': index !== 0 }"
            @click="handleSettingClick(item.id)"
          >
            <div class="flex items-center gap-4">
              <i :class="['fa-solid', item.icon, 'text-gray-600 w-5']"></i>
              <span class="font-medium text-gray-900">{{ item.label }}</span>
            </div>
            <i class="fa-solid fa-chevron-right text-gray-300"></i>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
