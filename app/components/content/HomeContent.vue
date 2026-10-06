<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import Moments from '~/components/Moments.vue'
import { api, type ServerFeedItem } from '~/utils/api'
import { notifyError } from '~/utils/notify'

// 时间线动态数据（与后端 GET /api/v1/feeds/timeline 对接）
interface MomentData {
  id: string
  content: string
  images?: string[]
  author: {
    id: string
    name: string
    avatar?: string
    verified?: boolean
  }
  publishTime: string
  location?: string
  stats: {
    likes: number
    comments: number
    shares: number
  }
  isLiked?: boolean
  /** 动态图片文件 UUID 列表（后端下发，需换取临时 URL） */
  fileUUIDs?: string[]
}

const moments = ref<MomentData[]>([])
const loading = ref(false)
const feedLoaded = ref(false)

// 后端时间（ISO 字符串）原样传给卡片组件，展示时统一人性化格式化（见 utils/time.ts）

// 后端 feed 条目 → 首页动态卡片数据（仅取动态类型）
function normalizeFeedMoment(item: ServerFeedItem): MomentData | null {
  if (item.type !== 'moment') return null
  const authorRaw = item.author
  const id = String(item.id ?? '')
  return {
    id,
    content: item.content ?? '',
    images: [],
    author: {
      id: authorRaw?.id ? String(authorRaw.id) : String(item.user_id ?? ''),
      name: authorRaw?.display_name || authorRaw?.displayName || authorRaw?.nickname || '用户',
      avatar: authorRaw?.avatar ?? undefined,
      verified: false,
    },
    publishTime: item.created_at ?? '',
    stats: {
      likes: item.stats?.likes ?? 0,
      comments: item.stats?.comments ?? 0,
      shares: item.stats?.shares ?? 0,
    },
    isLiked: item.is_liked ?? false,
    fileUUIDs: item.images ?? [],
  }
}

// 将动态图片 UUID 批量换取临时访问 URL（只取公开可访问的，其余静默跳过）。
// 安全：UUID 仅用于请求后端临时链接接口，不向任何外部地址拼接原始存储 URL。
async function resolveMomentImages(moment: MomentData): Promise<void> {
  if (!moment.fileUUIDs || moment.fileUUIDs.length === 0) return
  const urls: string[] = []
  for (const uuid of moment.fileUUIDs) {
    try {
      const res = await api.getFileTempLink(uuid)
      if (res.link?.url) {
        urls.push(res.link.url)
      }
    } catch {
      // 单张图片换取失败（如文件未公开分享）不影响其余图片展示
    }
  }
  moment.images = urls
}

async function fetchTimeline() {
  loading.value = true
  try {
    const res = await api.getFeedTimeline(0, 20)
    const items = (res.items ?? [])
      .map(normalizeFeedMoment)
      .filter((m): m is MomentData => m !== null)
    await Promise.all(items.map(resolveMomentImages))
    moments.value = items
  } catch (err) {
    notifyError(err, '获取时间线失败')
  } finally {
    loading.value = false
    feedLoaded.value = true
  }
}

onMounted(() => {
  fetchTimeline()
})

// 发布动态成功后刷新时间线（default.vue 中递增 feed:refreshKey）
const feedRefreshKey = useState<number>('feed:refreshKey', () => 0)
watch(feedRefreshKey, () => {
  fetchTimeline()
})

const emit = defineEmits<{
  (e: 'moment-comment', id: string): void
  (e: 'moment-share', id: string): void
  (e: 'moment-click', id: string): void
  (e: 'user-click', userId: string): void
}>()

// 点赞请求进行中集合（非响应式，仅作防抖标记）：
// 后端点赞幂等（重复点赞不计多次），快速连点时若每次都 ++ 会使前端计数虚高，故进行中忽略重复点击
const likePending = new Set<string>()

// 动态事件处理
const handleMomentLike = async (id: string) => {
  if (likePending.has(id)) return
  likePending.add(id)
  try {
    await api.likeMoment(id)
    const m = moments.value.find((x) => x.id === id)
    if (m && !m.isLiked) {
      m.stats.likes++
      m.isLiked = true
    }
  } catch (err) {
    notifyError(err, '点赞失败')
  } finally {
    likePending.delete(id)
  }
}

const handleMomentUnlike = async (id: string) => {
  if (likePending.has(id)) return
  likePending.add(id)
  try {
    await api.unlikeMoment(id)
    const m = moments.value.find((x) => x.id === id)
    if (m && m.isLiked) {
      m.stats.likes = Math.max(0, m.stats.likes - 1)
      m.isLiked = false
    }
  } catch (err) {
    notifyError(err, '取消点赞失败')
  } finally {
    likePending.delete(id)
  }
}

const handleMomentComment = (id: string) => {
  emit('moment-comment', id)
}

const handleMomentShare = (id: string) => {
  emit('moment-share', id)
}

const handleMomentClick = (id: string) => {
  navigateTo(`/moment/${encodeURIComponent(id)}`)
}

const handleUserClick = (userId: string) => {
  emit('user-click', userId)
}
</script>

<template>
  <div class="flex-1 p-4">
    <div class="max-w-2xl mx-auto space-y-4">
      <!-- 加载中 -->
      <div v-if="loading" class="glass-card rounded-2xl p-10 flex flex-col items-center justify-center gap-2 text-gray-400">
        <i class="fa-solid fa-circle-notch fa-spin text-2xl"></i>
        <span class="text-sm">加载中...</span>
      </div>

      <!-- 无数据 -->
      <div v-else-if="feedLoaded && moments.length === 0" class="glass-card rounded-2xl p-10 flex flex-col items-center justify-center gap-3 text-center">
        <i class="fa-regular fa-folder-open text-5xl text-gray-300"></i>
        <p class="text-gray-500">暂时没有动态</p>
        <p class="text-sm text-gray-400">发布第一条动态，和大家分享你的世界吧～</p>
      </div>

      <!-- 动态卡片 -->
      <template v-else>
        <Moments
          v-for="moment in moments"
          :key="moment.id"
          :moment="moment"
          @like="handleMomentLike"
          @unlike="handleMomentUnlike"
          @comment="handleMomentComment"
          @share="handleMomentShare"
          @click="handleMomentClick"
          @user-click="handleUserClick"
        />
      </template>
    </div>
  </div>
</template>
