<script setup lang="ts">
import { ref } from 'vue'

// 热门话题数据
const hotTopics = ref([
  { id: '1', name: 'MyGO', count: 12580 },
  { id: '2', name: 'BanGDream', count: 8960 },
  { id: '3', name: '春日影', count: 6540 },
  { id: '4', name: 'Crychic', count: 4320 },
  { id: '5', name: 'AveMujica', count: 3890 },
])

const emit = defineEmits<{
  (e: 'topic-click', topicId: string): void
}>()

const handleTopicClick = (topicId: string) => {
  emit('topic-click', topicId)
}
</script>

<template>
  <div class="flex-1 p-4">
    <div class="max-w-2xl mx-auto">
      <h2 class="text-xl font-bold text-gray-900 mb-4 px-2">热门话题</h2>
      <div class="bg-white rounded-2xl overflow-hidden">
        <div
          v-for="(topic, index) in hotTopics"
          :key="topic.id"
          class="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer"
          :class="{ 'border-b border-gray-100': index !== hotTopics.length - 1 }"
          @click="handleTopicClick(topic.id)"
        >
          <div class="flex items-center gap-4">
            <span class="text-lg font-bold text-lime-500 w-6">{{ index + 1 }}</span>
            <div>
              <h3 class="font-medium text-gray-900">#{{ topic.name }}</h3>
              <p class="text-sm text-gray-400">{{ topic.count }} 讨论</p>
            </div>
          </div>
          <i class="fa-solid fa-chevron-right text-gray-300"></i>
        </div>
      </div>
    </div>
  </div>
</template>
