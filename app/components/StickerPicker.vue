<script setup lang="ts">
// 贴纸选择器：「收藏夹」（个人：我上传 + 收藏，可置顶）与「贴纸包」（其他贴纸包，可整包收藏）分开显示。
// 安全：贴纸一律 <img> 渲染安全栅格图片（http(s) 临时链接），文本走 Vue 插值转义，禁止 v-html；
// 上传前前端做类型/大小校验（jpg/png/gif/webp、≤10MB），服务端再按文件头魔数嗅探二次校验。
import { onMounted, ref } from 'vue'
import { api, ApiRequestError, type ServerStickerInfo, type ServerStickerPackInfo } from '~/utils/api'
import { useStickerImage } from '~/composables/useStickerImage'
import { notifyError, notifySuccess } from '~/utils/notify'
import { validateStickerFile } from '~/utils/sticker'

const emit = defineEmits<{
  (e: 'select', stickerUuid: string): void
}>()

const PAGE = 30

const tab = ref<'collection' | 'packs'>('collection')

// 收藏夹（个人）
const collection = ref<ServerStickerInfo[]>([])
const collectionTotal = ref(0)

// 贴纸包列表 / 当前打开的贴纸包
const packs = ref<ServerStickerPackInfo[]>([])
const packsTotal = ref(0)
const activePack = ref<ServerStickerPackInfo | null>(null)
const packStickers = ref<ServerStickerInfo[]>([])

// 贴纸 uuid → 临时访问 URL
const imageUrls = ref<Record<string, string | null>>({})

const loading = ref(false)
const uploading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const { resolveStickerImage } = useStickerImage()

async function resolveImages(list: ServerStickerInfo[]): Promise<void> {
  await Promise.all(
    list.map(async (s) => {
      if (imageUrls.value[s.uuid] !== undefined) return
      imageUrls.value[s.uuid] = await resolveStickerImage(s.file_uuid)
    })
  )
}

async function loadCollection(append = false): Promise<void> {
  loading.value = true
  try {
    const res = await api.getStickerCollection(append ? collection.value.length : 0, PAGE)
    collection.value = append ? [...collection.value, ...res.stickers] : res.stickers
    collectionTotal.value = res.count
    await resolveImages(res.stickers)
  } catch (err) {
    notifyError(err, '加载贴纸收藏夹失败')
  } finally {
    loading.value = false
  }
}

async function loadPacks(append = false): Promise<void> {
  loading.value = true
  try {
    const res = await api.getStickerPacks(append ? packs.value.length : 0, PAGE, 'all')
    packs.value = append ? [...packs.value, ...res.packs] : res.packs
    packsTotal.value = res.count
  } catch (err) {
    notifyError(err, '加载贴纸包失败')
  } finally {
    loading.value = false
  }
}

async function openPack(pack: ServerStickerPackInfo): Promise<void> {
  loading.value = true
  try {
    const res = await api.getStickerPackDetail(pack.id)
    activePack.value = res.pack
    packStickers.value = res.stickers
    await resolveImages(res.stickers)
  } catch (err) {
    notifyError(err, '加载贴纸包详情失败')
  } finally {
    loading.value = false
  }
}

const backToPacks = () => {
  activePack.value = null
  packStickers.value = []
}

const handleTabChange = (next: 'collection' | 'packs') => {
  tab.value = next
  if (next === 'collection') {
    if (collection.value.length === 0) loadCollection()
  } else if (packs.value.length === 0) {
    loadPacks()
  }
}

// 点击贴纸：插入评论（一条评论最多 25 张贴纸，连续点击可在光标处叠加插入）
const handleSelect = (sticker: ServerStickerInfo) => emit('select', sticker.uuid)

// 置顶/取消置顶（仅收藏夹）
const handleToggleTop = async (sticker: ServerStickerInfo) => {
  try {
    const res = await api.setStickerTop(sticker.uuid, sticker.top === 1 ? 0 : 1)
    sticker.top = res.sticker.top
    notifySuccess(res.msg || '操作成功')
  } catch (err) {
    notifyError(err, '设置置顶失败')
  }
}

// 移除收藏（仅收藏他人贴纸 source=2）
const handleRemoveFavorite = async (sticker: ServerStickerInfo) => {
  try {
    const res = await api.unfavoriteSticker(sticker.uuid)
    notifySuccess(res.msg || '已取消收藏')
    collection.value = collection.value.filter((s) => s.uuid !== sticker.uuid)
    collectionTotal.value = Math.max(0, collectionTotal.value - 1)
  } catch (err) {
    notifyError(err, '取消收藏失败')
  }
}

// 收藏他人贴纸到收藏夹（贴纸包内）
const handleFavoriteSticker = async (sticker: ServerStickerInfo) => {
  try {
    const res = await api.favoriteSticker(sticker.uuid)
    notifySuccess(res.msg || '已加入收藏夹')
  } catch (err) {
    notifyError(err, '收藏失败')
  }
}

// 整包收藏/取消收藏（收藏后包内容更新自动同步）
const handleTogglePackFavorite = async (pack: ServerStickerPackInfo) => {
  try {
    const res = pack.is_favorite ? await api.unfavoriteStickerPack(pack.id) : await api.favoriteStickerPack(pack.id)
    pack.is_favorite = res.pack.is_favorite
    notifySuccess(res.msg || '操作成功')
  } catch (err) {
    notifyError(err, '操作失败')
  }
}

// 上传贴纸（登录、绑定手机号用户）
const handleUploadClick = () => fileInputRef.value?.click()

const handleFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files && input.files[0]
  input.value = ''
  if (!file) return

  const invalid = validateStickerFile(file)
  if (invalid) {
    notifyError(new Error(invalid), invalid)
    return
  }

  uploading.value = true
  try {
    const sticker = await api.uploadSticker(file)
    notifySuccess('贴纸上传成功')
    collection.value = [sticker, ...collection.value]
    collectionTotal.value += 1
    await resolveImages([sticker])
  } catch (err) {
    if (err instanceof ApiRequestError) {
      notifyError(err, err.message || '上传失败')
    } else {
      notifyError(err, '上传失败')
    }
  } finally {
    uploading.value = false
  }
}

onMounted(() => {
  loadCollection()
})

defineExpose({ handleTabChange })
</script>

<template>
  <div class="sticker-picker rounded-xl border border-gray-100 bg-white/70 overflow-hidden">
    <!-- 标签栏 -->
    <div class="flex items-center justify-between px-3 pt-2.5 pb-1.5">
      <div class="flex items-center gap-1">
        <button
          class="px-3 py-1.5 rounded-full text-sm transition-colors"
          :class="tab === 'collection' ? 'bg-lime-100 text-lime-700 font-medium' : 'text-gray-500 hover:bg-gray-100'"
          @click="handleTabChange('collection')"
        >
          收藏夹
        </button>
        <button
          class="px-3 py-1.5 rounded-full text-sm transition-colors"
          :class="tab === 'packs' ? 'bg-lime-100 text-lime-700 font-medium' : 'text-gray-500 hover:bg-gray-100'"
          @click="handleTabChange('packs')"
        >
          贴纸包
        </button>
      </div>

      <!-- 上传贴纸（仅收藏夹视图） -->
      <button
        v-if="tab === 'collection' && !activePack"
        class="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs text-lime-700 hover:bg-lime-50 transition-colors disabled:opacity-50"
        :disabled="uploading"
        title="上传贴纸（jpg/png/gif/webp，最大 10MB）"
        @click="handleUploadClick"
      >
        <i :class="uploading ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-cloud-arrow-up'"></i>
        <span>{{ uploading ? '上传中' : '上传贴纸' }}</span>
      </button>
      <input
        ref="fileInputRef"
        type="file"
        class="hidden"
        accept="image/png,image/jpeg,image/gif,image/webp"
        @change="handleFileChange"
      >
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="px-3 py-6 flex items-center justify-center text-gray-400 text-sm">
      <i class="fa-solid fa-circle-notch fa-spin mr-2"></i>
      <span>加载中...</span>
    </div>

    <!-- 收藏夹（个人）：置顶优先，我上传 + 收藏的贴纸 -->
    <div v-else-if="tab === 'collection'">
      <div v-if="collection.length === 0" class="px-3 py-6 text-center text-gray-400 text-sm">
        还没有贴纸，点击右上角上传或去贴纸包收藏吧～
      </div>
      <div v-else class="px-3 pb-2 max-h-56 overflow-y-auto">
        <div class="grid grid-cols-5 gap-2">
          <div v-for="sticker in collection" :key="sticker.uuid" class="flex flex-col items-center gap-1">
            <button
              class="w-full aspect-square rounded-lg bg-gray-50 hover:bg-lime-50 flex items-center justify-center overflow-hidden transition-colors"
              :title="sticker.name"
              @click="handleSelect(sticker)"
            >
              <img
                v-if="imageUrls[sticker.uuid]"
                :src="imageUrls[sticker.uuid]"
                :alt="sticker.name"
                class="w-full h-full object-contain"
                loading="lazy"
                referrerpolicy="no-referrer"
              >
              <i v-else class="fa-regular fa-image text-gray-300"></i>
            </button>
            <div class="flex items-center gap-1">
              <button
                class="px-1.5 py-0.5 rounded text-[10px] transition-colors"
                :class="sticker.top === 1 ? 'bg-lime-100 text-lime-700' : 'text-gray-400 hover:bg-gray-100'"
                :title="sticker.top === 1 ? '取消置顶' : '置顶'"
                @click="handleToggleTop(sticker)"
              >
                <i class="fa-solid fa-thumbtack"></i>
              </button>
              <button
                v-if="sticker.source === 2"
                class="px-1.5 py-0.5 rounded text-[10px] text-gray-400 hover:bg-gray-100 transition-colors"
                title="取消收藏"
                @click="handleRemoveFavorite(sticker)"
              >
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>
        </div>
        <button
          v-if="collection.length < collectionTotal"
          class="w-full mt-2 py-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          @click="loadCollection(true)"
        >
          加载更多（{{ collection.length }}/{{ collectionTotal }}）
        </button>
      </div>
    </div>

    <!-- 贴纸包：列表 / 包内贴纸 -->
    <div v-else>
      <!-- 包内贴纸 -->
      <div v-if="activePack" class="px-3 pb-2 max-h-56 overflow-y-auto">
        <div class="flex items-center gap-2 pb-2">
          <button
            class="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
            title="返回贴纸包列表"
            @click="backToPacks"
          >
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <span class="text-sm font-medium text-gray-800 truncate">{{ activePack.name }}</span>
          <span class="text-xs text-gray-400">{{ activePack.sticker_count }} 张</span>
          <button
            class="ml-auto px-2.5 py-1 rounded-full text-xs transition-colors"
            :class="activePack.is_favorite ? 'bg-gray-100 text-gray-500' : 'bg-lime-100 text-lime-700'"
            @click="handleTogglePackFavorite(activePack)"
          >
            {{ activePack.is_favorite ? '已收藏整包' : '收藏整包' }}
          </button>
        </div>
        <div v-if="packStickers.length === 0" class="py-6 text-center text-gray-400 text-sm">贴纸包还是空的～</div>
        <div v-else class="grid grid-cols-5 gap-2">
          <div v-for="sticker in packStickers" :key="sticker.uuid" class="flex flex-col items-center gap-1">
            <button
              class="w-full aspect-square rounded-lg bg-gray-50 hover:bg-lime-50 flex items-center justify-center overflow-hidden transition-colors"
              :title="sticker.name"
              @click="handleSelect(sticker)"
            >
              <img
                v-if="imageUrls[sticker.uuid]"
                :src="imageUrls[sticker.uuid]"
                :alt="sticker.name"
                class="w-full h-full object-contain"
                loading="lazy"
                referrerpolicy="no-referrer"
              >
              <i v-else class="fa-regular fa-image text-gray-300"></i>
            </button>
            <button
              class="px-1.5 py-0.5 rounded text-[10px] text-gray-400 hover:bg-gray-100 transition-colors"
              title="添加到收藏夹"
              @click="handleFavoriteSticker(sticker)"
            >
              <i class="fa-solid fa-plus"></i> 收藏
            </button>
          </div>
        </div>
      </div>

      <!-- 贴纸包列表 -->
      <div v-else class="px-3 pb-2 max-h-56 overflow-y-auto">
        <div v-if="packs.length === 0" class="py-6 text-center text-gray-400 text-sm">还没有贴纸包～</div>
        <div v-else class="space-y-1.5">
          <div
            v-for="pack in packs"
            :key="pack.id"
            class="flex items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-gray-50 transition-colors"
          >
            <button class="flex-1 min-w-0 text-left" @click="openPack(pack)">
              <div class="text-sm font-medium text-gray-800 truncate">{{ pack.name }}</div>
              <div class="text-xs text-gray-400 truncate">{{ pack.description || '暂无简介' }} · {{ pack.sticker_count }} 张</div>
            </button>
            <button
              class="px-2.5 py-1 rounded-full text-xs flex-shrink-0 transition-colors"
              :class="pack.is_favorite ? 'bg-gray-100 text-gray-500' : 'bg-lime-100 text-lime-700'"
              @click="handleTogglePackFavorite(pack)"
            >
              {{ pack.is_favorite ? '已收藏' : '收藏整包' }}
            </button>
          </div>
        </div>
        <button
          v-if="packs.length < packsTotal"
          class="w-full mt-2 py-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          @click="loadPacks(true)"
        >
          加载更多（{{ packs.length }}/{{ packsTotal }}）
        </button>
      </div>
    </div>

    <!-- 底部提示 -->
    <div class="px-3 py-1.5 border-t border-gray-100 text-[11px] text-gray-400">
      一条评论最多使用 25 张贴纸 · 单张贴纸最大 10MB · 收藏夹最多 500 张
    </div>
  </div>
</template>
