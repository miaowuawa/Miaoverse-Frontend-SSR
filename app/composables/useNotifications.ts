// 用户通知共享状态与操作（登录后使用）：
// - 列表（按分类分栏）、各分类未读数在所有页面/组件间共享（useState）
// - REST 拉取：列表、未读数、标记已读、全部已读、删除
// - SSE 推送：useNotificationStream 收到事件后调用 handleStreamEvent 更新状态
import type { NotificationCategory, NotificationItemData, ServerNotifyEvent, ServerNotifyUnread } from '~/types/notification'
import { emptyUnread, normalizeNotification } from '~/types/notification'
import { api } from '~/utils/api'
import { notifyError } from '~/utils/notify'

/** 列表本地缓存上限：超过后丢弃最旧条目，避免长会话内存无限增长 */
const MAX_ITEMS = 200

export function useNotifications() {
  const notifications = useState<NotificationItemData[]>('notify:items', () => [])
  const unread = useState<ServerNotifyUnread>('notify:unread', () => emptyUnread())
  const total = useState<number>('notify:total', () => 0)
  const loading = useState<boolean>('notify:loading', () => false)
  const loaded = useState<boolean>('notify:loaded', () => false)

  // 同步本地未读数（markRead/remove 后后端返回的最新未读数）
  function applyUnread(next: ServerNotifyUnread) {
    unread.value = next
  }

  // 拉取各分类未读数（导航小红点用）
  async function fetchUnread(): Promise<void> {
    try {
      const res = await api.getNotificationUnread()
      applyUnread(res.unread ?? emptyUnread())
    } catch (err) {
      notifyError(err, '通知未读数获取失败')
    }
  }

  // 拉取通知列表。reset=true 覆盖本地列表（切换分类/首次加载），否则追加分页。
  async function fetchNotifications(category: NotificationCategory | '', options: { reset?: boolean } = {}): Promise<void> {
    if (loading.value) return
    loading.value = true
    try {
      const offset = options.reset ? 0 : notifications.value.length
      const res = await api.getNotifications(category, offset, 20)
      const items = (res.notifies ?? []).map(normalizeNotification)
      notifications.value = options.reset ? items : [...notifications.value, ...items]
      total.value = res.count ?? notifications.value.length
      loaded.value = true
      if (notifications.value.length > MAX_ITEMS) {
        notifications.value = notifications.value.slice(0, MAX_ITEMS)
      }
    } catch (err) {
      notifyError(err, '通知列表获取失败')
    } finally {
      loading.value = false
    }
  }

  // 标记单条已读（幂等；已读条目不再请求）
  async function markRead(id: string): Promise<void> {
    const item = notifications.value.find((n) => n.id === id)
    if (item?.read) return
    try {
      const res = await api.markNotificationRead(id)
      if (item) item.read = true
      applyUnread(res.unread ?? emptyUnread())
    } catch (err) {
      notifyError(err, '标记已读失败')
    }
  }

  // 全部标记已读（幂等）
  async function markAllRead(): Promise<void> {
    try {
      const res = await api.markAllNotificationsRead()
      notifications.value = notifications.value.map((n) => ({ ...n, read: true }))
      applyUnread(res.unread ?? emptyUnread())
    } catch (err) {
      notifyError(err, '标记已读失败')
    }
  }

  // 删除单条通知（软删除）
  async function remove(id: string): Promise<void> {
    try {
      const res = await api.deleteNotification(id)
      notifications.value = notifications.value.filter((n) => n.id !== id)
      total.value = Math.max(0, total.value - 1)
      applyUnread(res.unread ?? emptyUnread())
    } catch (err) {
      notifyError(err, '删除通知失败')
    }
  }

  // SSE 新通知到达：插入列表头部并用事件携带的最新未读数刷新小红点
  function handleStreamEvent(payload: ServerNotifyEvent): NotificationItemData | null {
    if (!payload?.notify?.id) return null
    const item = normalizeNotification(payload.notify)
    notifications.value = [item, ...notifications.value.filter((n) => n.id !== item.id)]
    if (notifications.value.length > MAX_ITEMS) {
      notifications.value = notifications.value.slice(0, MAX_ITEMS)
    }
    total.value += 1
    if (payload.unread) {
      applyUnread(payload.unread)
    } else {
      void fetchUnread()
    }
    return item
  }

  // 退出登录时清空本地通知状态
  function reset(): void {
    notifications.value = []
    unread.value = emptyUnread()
    total.value = 0
    loaded.value = false
  }

  return {
    notifications,
    unread,
    total,
    loading,
    loaded,
    fetchUnread,
    fetchNotifications,
    markRead,
    markAllRead,
    remove,
    handleStreamEvent,
    reset,
  }
}
