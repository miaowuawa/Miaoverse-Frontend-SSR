// 用户在线状态共享缓存（基于后端 SSE 连接心跳判定）：
// - fetchPresence 批量拉取在线状态，TTL 内的结果直接复用（force=true 强制刷新）
// - presenceOf / isOnline 查询单个用户在线状态
// 在线状态是尽力而为的旁路信息：拉取失败静默忽略，不打断页面主流程。
import type { PresenceData } from '~/types/presence'
import { normalizePresence } from '~/types/presence'
import { api } from '~/utils/api'

/** 在线状态缓存有效期（毫秒）：30 秒内复用，避免列表/页面频繁请求 */
const PRESENCE_TTL_MS = 30 * 1000

export function usePresence() {
  const presence = useState<Record<string, PresenceData>>('presence:map', () => ({}))
  const fetchedAt = useState<Record<string, number>>('presence:fetchedAt', () => ({}))

  // 批量拉取在线状态（去重、跳过 TTL 内已有结果的用户）
  async function fetchPresence(uids: Array<string | number>, options: { force?: boolean } = {}): Promise<void> {
    const now = Date.now()
    const missing = [...new Set(uids.map((uid) => String(Number(uid))))].filter((uid) => {
      if (!uid || uid === 'NaN' || uid === '0') return false
      return options.force || !fetchedAt.value[uid] || now - fetchedAt.value[uid] > PRESENCE_TTL_MS
    })
    if (missing.length === 0) return

    try {
      const res = await api.getPresence(missing)
      const at = Date.now()
      const next = { ...presence.value }
      const nextAt = { ...fetchedAt.value }
      for (const raw of res.presence ?? []) {
        next[String(raw.uid)] = normalizePresence(raw)
        nextAt[String(raw.uid)] = at
      }
      presence.value = next
      fetchedAt.value = nextAt
    } catch {
      // 静默忽略：在线状态为辅助信息，不弹错误提示
    }
  }

  // 查询单个用户在线状态（无缓存返回 null）
  function presenceOf(uid: string | number): PresenceData | null {
    return presence.value[String(uid)] ?? null
  }

  // 用户是否在线（无缓存按离线处理）
  function isOnline(uid: string | number): boolean {
    return presenceOf(uid)?.online ?? false
  }

  return {
    presence,
    fetchPresence,
    presenceOf,
    isOnline,
  }
}
