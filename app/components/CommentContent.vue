<script setup lang="ts">
// 评论/回复正文渲染：文本段纯文本渲染 + 贴纸段随文字穿插内联展示（一条评论最多 25 张贴纸）。
// 安全：文本一律 Vue 文本插值（自动 HTML 转义），禁止 v-html；
// 贴纸只用 <img> 展示安全栅格图片（http(s) 临时链接），贴纸被封禁/失效时隐藏并在正文下灰字提示。
import { computed, onMounted, ref, watch } from 'vue'
import { useStickerImage } from '~/composables/useStickerImage'
import type { CommentStickerInfo } from '~/types/comment'
import { parseCommentSegments, type CommentSegment } from '~/utils/sticker'

const props = defineProps<{
  content: string
  /** 评论内嵌贴纸展示信息（按 content 中标记出现顺序） */
  stickers?: CommentStickerInfo[] | null
  /** 紧凑模式（楼中楼回复用，字号更小） */
  compact?: boolean
}>()

const { resolveStickerImage } = useStickerImage()
// 贴纸图片临时链接：fileUuid → url（临时链接约 5 分钟有效，由 useStickerImage 缓存续期）
const stickerUrls = ref<Record<string, string>>({})

// 正文分段：文本段纯文本渲染，贴纸段在原位置内联展示
const segments = computed<CommentSegment[]>(() => parseCommentSegments(props.content, props.stickers))

// 贴纸被封禁（所在贴纸包被封禁）或已删除时不展示，正文下灰字提示
const hasHiddenSticker = computed(() => (props.stickers ?? []).some((s) => s.hidden))

async function loadStickers(): Promise<void> {
  const stickers = props.stickers ?? []
  const next: Record<string, string> = {}
  await Promise.all(
    stickers.map(async (s) => {
      if (s.hidden || !s.fileUuid || next[s.fileUuid]) return
      const url = await resolveStickerImage(s.fileUuid)
      if (url) next[s.fileUuid] = url
    })
  )
  stickerUrls.value = next
}

onMounted(loadStickers)
watch(() => props.stickers, loadStickers, { deep: true })
</script>

<template>
  <div>
    <p
      class="leading-relaxed text-gray-800 break-words whitespace-pre-wrap"
      :class="compact ? 'text-[14px]' : 'text-[15px]'"
    >
      <template v-for="(seg, index) in segments" :key="index">
        <span v-if="seg.type === 'text'">{{ seg.text }}</span>
        <img
          v-else-if="seg.type === 'sticker' && !seg.sticker.hidden && stickerUrls[seg.sticker.fileUuid]"
          :src="stickerUrls[seg.sticker.fileUuid]"
          :alt="seg.sticker.name || '贴纸'"
          class="comment-inline-sticker"
          loading="lazy"
          referrerpolicy="no-referrer"
        >
      </template>
    </p>
    <!-- 贴纸未显示提示（贴纸包被封禁/贴纸已删除） -->
    <p v-if="hasHiddenSticker" class="mt-1 text-xs text-gray-400">部分贴纸未显示</p>
  </div>
</template>

<style scoped>
/* 评论内嵌贴纸：随文字穿插、缩小展示，避免喧宾夺主 */
.comment-inline-sticker {
  display: inline-block;
  height: 24px;
  max-width: 72px;
  width: auto;
  object-fit: contain;
  vertical-align: middle;
  margin: 0 2px;
  border-radius: 4px;
}
</style>
