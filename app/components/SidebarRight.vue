<script setup lang="ts">
// 通知项接口
interface NotificationItem {
  id: string
  type: 'login' | 'mention' | 'follow' | 'like'
  title: string
  time: string
  icon?: string
  iconColor?: string
  read: boolean
}

// 模拟通知数据
const notifications: NotificationItem[] = [
  {
    id: '1',
    type: 'login',
    title: '有新的登录',
    time: '14小时前',
    icon: 'fa-user',
    iconColor: 'bg-blue-500',
    read: false,
  },
]

// 趋势项接口
interface TrendItem {
  id: string
  tag: string
  description: string
  count: string
  chart?: number[]
}

// 模拟趋势数据
const trends: TrendItem[] = [
  {
    id: '1',
    tag: '#フォロワーの9割が体験したことなさそ…',
    description: '11人投稿',
    count: '11人投稿',
    chart: [20, 40, 30, 50, 40, 60, 50],
  },
  {
    id: '2',
    tag: '#mewk',
    description: '1人投稿',
    count: '1人投稿',
    chart: [30, 20, 40, 30, 50, 40, 60],
  },
  {
    id: '3',
    tag: '#shindanmaker',
    description: '2人投稿',
    count: '2人投稿',
    chart: [40, 30, 50, 40, 30, 50, 40],
  },
  {
    id: '4',
    tag: '#イラスト',
    description: '1人投稿',
    count: '1人投稿',
    chart: [50, 60, 70, 80, 70, 60, 70],
  },
  {
    id: '5',
    tag: '#门.jp',
    description: '3人投稿',
    count: '3人投稿',
    chart: [30, 40, 30, 40, 50, 40, 50],
  },
]

const emit = defineEmits<{
  (e: 'notification-click', id: string): void
  (e: 'trend-click', id: string): void
  (e: 'settings-click'): void
}>()

const handleNotificationClick = (id: string) => {
  emit('notification-click', id)
}

const handleTrendClick = (id: string) => {
  emit('trend-click', id)
}

const handleSettingsClick = () => {
  emit('settings-click')
}

// 生成简单的 SVG 路径用于趋势图
const generateChartPath = (data: number[]) => {
  if (!data || data.length === 0) return ''
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const width = 60
  const height = 30
  
  return data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width
      const y = height - ((value - min) / range) * height
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')
}
</script>

<template>
  <aside class="w-80 h-screen bg-white border-l border-gray-200 flex flex-col fixed right-0 top-0">
    <!-- 通知区域 -->
    <div class="p-4 border-b border-gray-200">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-medium text-gray-800 flex items-center gap-2">
          <i class="fa-solid fa-bell text-gray-400"></i>
          通知
        </h3>
        <button
          class="text-gray-400 hover:text-gray-600 transition-colors"
          @click="handleSettingsClick"
        >
          <i class="fa-solid fa-gear"></i>
        </button>
      </div>

      <!-- 通知列表 -->
      <div class="space-y-3">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
          @click="handleNotificationClick(notification.id)"
        >
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            :class="notification.iconColor || 'bg-gray-200'"
          >
            <i :class="['fa-solid', notification.icon || 'fa-bell', 'text-white text-sm']"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-gray-800 truncate">{{ notification.title }}</p>
            <p class="text-xs text-gray-400 mt-0.5">{{ notification.time }}</p>
          </div>
          <span
            v-if="!notification.read"
            class="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"
          ></span>
        </div>
      </div>
    </div>

    <!-- 趋势区域 -->
    <div class="flex-1 overflow-y-auto p-4">
      <h3 class="font-medium text-gray-800 mb-3 flex items-center gap-2">
        <i class="fa-solid fa-hashtag text-gray-400"></i>
        趋势
      </h3>

      <!-- 趋势列表 -->
      <div class="space-y-4">
        <div
          v-for="trend in trends"
          :key="trend.id"
          class="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors"
          @click="handleTrendClick(trend.id)"
        >
          <div class="flex-1 min-w-0 pr-3">
            <p class="text-sm text-gray-800 truncate">{{ trend.tag }}</p>
            <p class="text-xs text-gray-400 mt-0.5">{{ trend.count }}</p>
          </div>
          <!-- 趋势图表 -->
          <div class="w-[60px] h-[30px] flex-shrink-0">
            <svg
              v-if="trend.chart"
              viewBox="0 0 60 30"
              class="w-full h-full"
              preserveAspectRatio="none"
            >
              <path
                :d="generateChartPath(trend.chart)"
                fill="none"
                stroke="#84cc16"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部编辑小工具 -->
    <div class="p-4 border-t border-gray-200">
      <button class="w-full flex items-center justify-center gap-2 text-lime-500 hover:text-lime-600 text-sm transition-colors">
        <i class="fa-solid fa-pen-nib"></i>
        <span>编辑小工具</span>
      </button>
    </div>
  </aside>
</template>
