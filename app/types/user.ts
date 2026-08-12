// 用户账号类型
export interface UserAccount {
  id: string
  displayName: string
  handle: string
  avatar?: string | null
  isCurrent?: boolean
}

// 服务器原始返回的用户信息
export interface ServerUserPayload {
  id?: string | number
  display_name?: string
  displayName?: string
  handle?: string
  username?: string
  nickname?: string
  avatar?: string | null
  status?: number
  created_at?: string
}

// 当前登录用户状态
export interface CurrentUser {
  id: string
  displayName: string
  handle: string
  avatar?: string | null
  token?: string
}

// 300 Multiple Choices 账号候选
export interface MultipleAccountChoice {
  id: string
  displayName: string
  handle: string
  avatar?: string | null
  lastUsedAt?: string
  registeredAt?: string
}

// 登录结果：单账号成功 / 多账号需要选择
export type LoginResult =
  | { type: 'success'; user: CurrentUser }
  | { type: 'multiple_choices'; phone: string; choices: MultipleAccountChoice[] }

export function normalizeServerUser(payload?: ServerUserPayload | null): CurrentUser | null {
  if (!payload) return null
  const id = payload.id || 'unknown'
  const displayName = payload.display_name || payload.displayName || payload.nickname || '用户'
  const handle = payload.handle || payload.username || `@${id}`
  return {
    id,
    displayName,
    handle: handle.startsWith('@') ? handle : `@${handle}`,
    avatar: payload.avatar ?? null,
  }
}

export function normalizeMultipleChoice(raw?: ServerUserPayload | null, idx = 0): MultipleAccountChoice | null {
  if (!raw) return null
  const id = String(raw.id ?? '') || `account-${idx}`
  const displayName = raw.display_name || raw.displayName || raw.nickname || raw.username || '未命名'
  const handle = raw.handle || raw.username || `@${id}`
  return {
    id,
    displayName,
    handle: handle.startsWith('@') ? handle : `@${handle}`,
    avatar: raw.avatar ?? null,
    registeredAt: formatRegDate(raw.created_at),
  }
}

// 后端返回 ISO 时间（如 2026-06-01T12:00:00+08:00），转成 "2022/01/22" 展示格式
function formatRegDate(iso?: string): string | undefined {
  if (!iso) return undefined
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}/${m}/${d}`
}
