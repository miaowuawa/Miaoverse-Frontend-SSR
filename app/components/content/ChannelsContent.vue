<script setup lang="ts">
import { ref } from 'vue'

// 频道数据
const channels = ref([
  { id: '1', name: 'MyGO!!!!! 官方频道', description: '官方资讯与活动', subscribers: 50000 },
  { id: '2', name: 'BanG Dream! 资讯', description: 'BanG Dream! 系列最新资讯', subscribers: 35000 },
  { id: '3', name: '邦邦同人创作', description: '同人作品分享交流', subscribers: 12000 },
])

const emit = defineEmits<{
  (e: 'channel-click', channelId: string): void
  (e: 'subscribe', channelId: string): void
}>()

const handleChannelClick = (channelId: string) => {
  emit('channel-click', channelId)
}

const handleSubscribe = (channelId: string) => {
  emit('subscribe', channelId)
}
</script>

<template>
  <div class="flex-1 p-4">
    <div class="max-w-2xl mx-auto">
      <h2 class="text-xl font-bold text-gray-900 mb-4 px-2">推荐频道</h2>
      <div class="space-y-3">
        <div
          v-for="channel in channels"
          :key="channel.id"
          class="bg-white rounded-2xl p-4 flex items-center gap-4 hover:shadow-md transition-all cursor-pointer"
          @click="handleChannelClick(channel.id)"
        >
          <div class="w-14 h-14 bg-lime-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <i class="fa-solid fa-tv text-lime-500 text-xl"></i>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-gray-900 truncate">{{ channel.name }}</h3>
            <p class="text-sm text-gray-500 truncate">{{ channel.description }}</p>
            <p class="text-xs text-gray-400 mt-1">{{ channel.subscribers }} 订阅</p>
          </div>
          <button
            class="px-4 py-2 bg-lime-500 text-white text-sm font-medium rounded-full hover:bg-lime-600 transition-colors"
            @click.stop="handleSubscribe(channel.id)"
          >
            订阅
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
