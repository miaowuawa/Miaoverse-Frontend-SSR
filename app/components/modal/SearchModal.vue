<script setup lang="ts">
import { ref, watch } from 'vue'
import Modal from './Modal.vue'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'search', keyword: string): void
  (e: 'select', item: SearchSuggestion): void
}>()

// 搜索建议项接口
interface SearchSuggestion {
  id: string
  type: 'user' | 'tag' | 'post'
  title: string
  subtitle?: string
  icon?: string
}

const searchKeyword = ref('')
const suggestions = ref<SearchSuggestion[]>([])
const isLoading = ref(false)

// 模拟搜索数据
const mockData: SearchSuggestion[] = [
  { id: '1', type: 'tag', title: '#热门话题', subtitle: '12.5万参与', icon: 'fa-hashtag' },
  { id: '2', type: 'tag', title: '#喵星人', subtitle: '8.3万参与', icon: 'fa-hashtag' },
  { id: '3', type: 'user', title: '小明', subtitle: '@xiaoming', icon: 'fa-user' },
  { id: '4', type: 'user', title: '张三', subtitle: '@zhangsan', icon: 'fa-user' },
  { id: '5', type: 'post', title: '今天的天气真好', subtitle: '3小时前', icon: 'fa-file-lines' },
]

// 监听输入变化，自动展示候选词
watch(searchKeyword, (newVal) => {
  if (!newVal.trim()) {
    suggestions.value = []
    return
  }

  isLoading.value = true

  // 模拟 API 延迟
  setTimeout(() => {
    suggestions.value = mockData.filter(item =>
      item.title.toLowerCase().includes(newVal.toLowerCase()) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(newVal.toLowerCase()))
    )
    isLoading.value = false
  }, 300)
})

const handleClose = () => {
  emit('update:visible', false)
  searchKeyword.value = ''
  suggestions.value = []
}

const handleSearch = () => {
  if (!searchKeyword.value.trim()) return
  emit('search', searchKeyword.value)
}

const handleSelect = (item: SearchSuggestion) => {
  emit('select', item)
  handleClose()
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    handleSearch()
  }
}
</script>

<template>
  <Modal
    :visible="visible"
    width="max-w-xl"
    position="top"
    :show-close="false"
    @close="handleClose"
    @update:visible="emit('update:visible', $event)"
  >
    <!-- 搜索输入区 -->
    <div class="p-4 border-b border-gray-100">
      <div class="flex items-center gap-3">
        <div class="flex-1 relative">
          <div class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <i class="fa-solid fa-magnifying-glass"></i>
          </div>
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索用户、话题、帖子..."
            class="w-full bg-gray-100 rounded-xl py-3 pl-11 pr-4 outline-none text-gray-700 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-lime-200 transition-all"
            @keydown="handleKeydown"
          >
          <!-- 清除按钮 -->
          <button
            v-if="searchKeyword"
            class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-gray-300 hover:bg-gray-400 rounded-full flex items-center justify-center text-white text-xs transition-colors"
            @click="searchKeyword = ''"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <button
          class="px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
          @click="handleClose"
        >
          取消
        </button>
      </div>
    </div>

    <!-- 搜索建议列表 -->
    <div class="max-h-96 overflow-y-auto">
      <!-- 加载状态 -->
      <div v-if="isLoading" class="p-8 text-center">
        <i class="fa-solid fa-circle-notch fa-spin text-2xl text-lime-500"></i>
        <p class="text-sm text-gray-400 mt-2">搜索中...</p>
      </div>

      <!-- 候选词列表 -->
      <div v-else-if="suggestions.length > 0">
        <div
          v-for="item in suggestions"
          :key="item.id"
          class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
          @click="handleSelect(item)"
        >
          <!-- 图标 -->
          <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <i :class="['fa-solid', item.icon, 'text-gray-500']"></i>
          </div>
          <!-- 内容 -->
          <div class="flex-1 min-w-0">
            <p class="text-sm text-gray-800 truncate">{{ item.title }}</p>
            <p class="text-xs text-gray-400">{{ item.subtitle }}</p>
          </div>
          <!-- 箭头 -->
          <i class="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
        </div>
      </div>

      <!-- 无结果 -->
      <div v-else-if="searchKeyword && !isLoading" class="p-8 text-center">
        <i class="fa-solid fa-magnifying-glass text-4xl text-gray-200 mb-3"></i>
        <p class="text-sm text-gray-400">未找到相关结果</p>
      </div>

      <!-- 默认提示 -->
      <div v-else class="p-6">
        <p class="text-xs text-gray-400 mb-3">热门搜索</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="tag in ['喵星人', '美食', '旅行', '摄影', '日常']"
            :key="tag"
            class="px-3 py-1.5 bg-gray-100 hover:bg-lime-100 text-gray-600 hover:text-lime-700 text-sm rounded-full transition-colors"
            @click="searchKeyword = tag"
          >
            {{ tag }}
          </button>
        </div>
      </div>
    </div>
  </Modal>
</template>
