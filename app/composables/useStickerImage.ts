// 贴纸图片解析：贴纸文件 UUID → 临时访问 URL（临时链接约 5 分钟有效，缓存 4 分钟后强制重新换取）。
// 原始存储 URL 不下发；换取失败返回 null，由调用方降级（不展示贴纸）。
// 安全：只接受 http(s) 临时链接，渲染一律使用 <img>（不使用 v-html / 内联 SVG）。
import { api } from '~/utils/api'
import { isSafeRemoteUrl } from '~/utils/sticker'

const CACHE_TTL_MS = 4 * 60 * 1000

interface CacheEntry {
  url: string
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

export function useStickerImage() {
  async function resolveStickerImage(fileUuid?: string | null): Promise<string | null> {
    if (!fileUuid) return null
    const now = Date.now()
    const hit = cache.get(fileUuid)
    if (hit && hit.expiresAt > now) {
      return hit.url
    }
    try {
      const res = await api.getFileTempLink(fileUuid)
      const url = res.link?.url
      if (!url || !isSafeRemoteUrl(url)) return null
      cache.set(fileUuid, { url, expiresAt: now + CACHE_TTL_MS })
      return url
    } catch {
      return null
    }
  }

  return { resolveStickerImage }
}
