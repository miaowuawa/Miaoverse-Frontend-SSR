// 时间展示工具：把后端时间戳转成人性化相对时间，悬停时显示精确日期时间。
//
// 相对时间规则（以当前时刻为基准）：
// - 1 分钟内：刚刚
// - 1 小时内：x分钟前
// - 24 小时内：x小时前
// - 7 天内：x天前
// - 30 天内：x周前
// - 12 个月内：x月前
// - 超过 12 个月：直接显示日期（YYYY-MM-DD）
//
// 悬停提示（title）一律显示精确时间「YYYY-MM-DD HH:MM:SS」。
// 解析兼容两种后端格式：RFC3339（如 2026-08-13T06:35:51Z / +08:00）与
// 无时区标记的「YYYY-MM-DD HH:MM:SS」（按浏览器本地时区解析）。

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

/** 解析后端时间字符串/时间戳为 Date（无法解析返回 null） */
export function parseApiTime(value?: string | number | Date | null): Date | null {
  if (value === undefined || value === null || value === '') return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  const raw = String(value).trim()
  // 无时区标记的「YYYY-MM-DD HH:MM:SS」（MySQL DATETIME）统一转成 ISO 本地时间解析
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw) ? raw.replace(' ', 'T') : raw
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

/** 人性化相对时间：刚刚 / x分钟前 / x小时前 / x天前 / x周前 / x月前 / 超过 12 个月显示日期 */
export function formatRelativeTime(value?: string | number | Date | null): string {
  const date = parseApiTime(value)
  if (!date) return ''
  const diff = Date.now() - date.getTime()
  if (diff < MINUTE_MS) return '刚刚'
  if (diff < HOUR_MS) return `${Math.floor(diff / MINUTE_MS)}分钟前`
  if (diff < DAY_MS) return `${Math.floor(diff / HOUR_MS)}小时前`
  if (diff < 7 * DAY_MS) return `${Math.floor(diff / DAY_MS)}天前`
  if (diff < 30 * DAY_MS) return `${Math.floor(diff / (7 * DAY_MS))}周前`
  if (diff < 365 * DAY_MS) return `${Math.floor(diff / (30 * DAY_MS))}月前`
  return formatDate(date)
}

/** 精确日期时间（悬停提示用）：2026-08-13 14:35:51 */
export function formatAbsoluteTime(value?: string | number | Date | null): string {
  const date = parseApiTime(value)
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`
}

/** 纯日期：2026-08-13 */
export function formatDate(value: string | number | Date): string {
  const date = value instanceof Date ? value : parseApiTime(value)
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
