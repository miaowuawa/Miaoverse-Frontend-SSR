// 头像解析工具：user.avatar 字段为文件 UUID（不再存 URL），
// 展示前通过后端临时链接接口换取可访问 URL。
// 头像为公开可见文件，不受拉黑/屏蔽影响；换取失败时返回 null，由调用方展示占位。
import { api } from '~/utils/api'

// 临时链接有效期约 5 分钟，缓存 4 分钟后强制重新换取，避免使用过期链接
const CACHE_TTL_MS = 4 * 60 * 1000

interface CacheEntry {
  url: string
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

export function useAvatar() {
  async function resolveAvatar(avatarUuid?: string | null): Promise<string | null> {
    if (!avatarUuid) return null
    const now = Date.now()
    const hit = cache.get(avatarUuid)
    if (hit && hit.expiresAt > now) {
      return hit.url
    }
    try {
      const res = await api.getFileTempLink(avatarUuid)
      if (!res.link?.url) return null
      cache.set(avatarUuid, { url: res.link.url, expiresAt: now + CACHE_TTL_MS })
      return res.link.url
    } catch {
      return null
    }
  }

  return { resolveAvatar }
}
