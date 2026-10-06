// 用户在线状态（基于 SSE 连接心跳判定，与后端 resp.PresenceInfo 一一对应）：
// - online：该用户有活跃 SSE 连接且心跳正常（服务端每 15 秒下发心跳，写出失败即断开）
// - last_seen：最近活跃时间；从未连接过为后端零值时间，归一化为 null

export interface ServerPresence {
  uid: number
  online: boolean
  last_seen: string
}

export interface PresenceData {
  online: boolean
  /** 最近活跃时间（后端时间字符串），从未连接过为 null */
  lastSeen: string | null
}

/** Go 零值时间（time.Time 序列化为 0001-01-01T00:00:00Z）判定 */
function isZeroTime(value: string): boolean {
  return !value || value.startsWith('0001-01-01')
}

export function normalizePresence(raw: ServerPresence): PresenceData {
  return {
    online: !!raw.online,
    lastSeen: isZeroTime(raw.last_seen ?? '') ? null : raw.last_seen,
  }
}
