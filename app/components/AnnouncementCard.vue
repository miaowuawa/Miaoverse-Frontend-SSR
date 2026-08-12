<script setup lang="ts">
import { useGlassTilt } from '~/composables/useGlassTilt'

interface Props {
  date: string
  author: string
  title: string
  content: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'click'): void
}>()

const handleClick = () => {
  emit('click')
}

// 玻璃倾斜效果（信息流卡片）
const cardRef = useGlassTilt()
</script>

<template>
  <div
    ref="cardRef"
    class="glass-card glass-card-feed glass-tilt rounded-2xl p-6 hover:shadow-lg transition-shadow cursor-pointer"
    @click="handleClick"
  >
    <!-- 头部：日期和作者 -->
    <div class="flex items-center gap-2 text-sm text-gray-400 mb-4">
      <span>{{ date }}</span>
      <span>·</span>
      <span>{{ author }}</span>
    </div>

    <!-- 标题 -->
    <h2 class="text-2xl font-bold text-gray-900 mb-4 leading-tight">
      {{ title }}
    </h2>

    <!-- 内容 -->
    <div class="text-gray-700 text-[15px] leading-relaxed whitespace-pre-line">
      {{ content }}
    </div>
  </div>
</template>

<style scoped>
</style>
