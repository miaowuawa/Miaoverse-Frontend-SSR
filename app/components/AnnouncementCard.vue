<script setup lang="ts">
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
</script>

<template>
  <div 
    class="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer"
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
/* 悬停效果 */
.bg-white {
  will-change: transform, box-shadow;
}
</style>
