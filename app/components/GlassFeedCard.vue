<script setup lang="ts">
/**
 * GlassFeedCard
 * 信息流类卡片的玻璃容器组件，内部自动启用「鼠标跟随光斑 + 微微倾斜」。
 * 把任意卡片内容包进来即可获得效果，规避 v-for 中 ref 取数组的问题。
 *
 * 用法：
 *   <GlassFeedCard class="rounded-2xl p-4" @click="...">
 *     ...卡片内容...
 *   </GlassFeedCard>
 *
 * 注意：传入的 class 会作用于根节点，建议包含圆角与内边距。
 */
import { useGlassTilt } from '~/composables/useGlassTilt'

const cardRef = useGlassTilt()
</script>

<template>
  <div ref="cardRef" class="glass-card glass-card-feed glass-tilt">
    <slot />
  </div>
</template>