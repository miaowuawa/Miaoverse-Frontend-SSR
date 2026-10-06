// 通知 SSE 实时推送连接（客户端单例）：
// - 连接 GET /api/v1/notify/stream（EventSource 同源请求自动携带 session cookie）
// - 收到 `event: notification` 后更新 useNotifications 共享状态并弹出新通知提示
// - 心跳（`event: ping`，服务端每 15 秒一帧）用于在线判定：持续收到心跳 = 连接在线；
//   超过 HEARTBEAT_TIMEOUT_MS 收不到心跳即判定连接离线（半开连接 EventSource 不会主动报错），
//   看门狗主动断开并重建连接
// - 断线后浏览器 EventSource 也会按服务端 retry 提示（默认 5 秒）自动重连
// - 登录后 connect()，退出登录 disconnect()
import type { ServerNotifyEvent } from '~/types/notification'
import { categoryMeta } from '~/types/notification'
import { notifyInfo } from '~/utils/notify'

// 模块级单例：多个组件调用 useNotificationStream 时复用同一条连接
let source: EventSource | null = null
// 最近一次收到服务端帧（心跳/通知）的时间戳
let lastBeatAt = 0
let watchdog: ReturnType<typeof setInterval> | null = null

/** 心跳超时判定（毫秒）：3 倍服务端心跳间隔（15s），容忍单帧延迟 */
const HEARTBEAT_TIMEOUT_MS = 45 * 1000
/** 看门狗巡检间隔（毫秒） */
const WATCHDOG_INTERVAL_MS = 10 * 1000

export function useNotificationStream() {
  const status = useState<'idle' | 'connecting' | 'open' | 'closed'>('notify:streamStatus', () => 'idle')
  const notifications = useNotifications()

  // 连接是否在线（收到心跳/事件且未超时）
  const connected = computed(() => status.value === 'open')

  // 新通知到达：刷新共享状态 + 弹出提示
  function onEvent(payload: ServerNotifyEvent) {
    const item = notifications.handleStreamEvent(payload)
    if (!item) return
    const meta = categoryMeta(item.category)
    notifyInfo(`${meta.label} · ${item.title}`, item.content || undefined)
  }

  // 收到服务端任一帧（心跳/通知）即刷新活跃时间
  function onBeat() {
    lastBeatAt = Date.now()
    status.value = 'open'
  }

  // 心跳看门狗：超时未收到心跳 → 判定连接离线，主动重建连接
  function startWatchdog() {
    stopWatchdog()
    watchdog = setInterval(() => {
      if (!source) return
      if (Date.now() - lastBeatAt > HEARTBEAT_TIMEOUT_MS) {
        reconnect()
      }
    }, WATCHDOG_INTERVAL_MS)
  }

  function stopWatchdog() {
    if (watchdog) {
      clearInterval(watchdog)
      watchdog = null
    }
  }

  // 心跳超时后的强制重连：丢弃旧连接（半开连接不会自己报错）并重建
  function reconnect() {
    const stale = source
    source = null
    stale?.close()
    status.value = 'closed'
    connect()
  }

  // 建立 SSE 连接（重复调用幂等；仅客户端执行）
  function connect(): void {
    if (!import.meta.client) return
    if (source) return

    status.value = 'connecting'
    lastBeatAt = Date.now()
    const es = new EventSource('/api/v1/notify/stream', { withCredentials: true })
    source = es

    es.onopen = () => {
      onBeat()
      // 连接期间可能漏掉推送（离线/重连窗口），同步一次未读数兜底
      void notifications.fetchUnread()
    }
    es.onerror = () => {
      // EventSource 会按 retry 提示自动重连；这里只记录状态
      status.value = 'closed'
    }
    // 心跳帧：收到即认为连接在线（EventSource 对注释帧不回调，服务端使用 event: ping 保证可观测）
    es.addEventListener('ping', onBeat)
    es.addEventListener('notification', (evt) => {
      onBeat()
      try {
        onEvent(JSON.parse((evt as MessageEvent).data) as ServerNotifyEvent)
      } catch {
        // 载荷异常直接忽略，数据以数据库为准
      }
    })

    startWatchdog()
  }

  // 断开 SSE 连接（退出登录时调用）
  function disconnect(): void {
    if (!import.meta.client) return
    source?.close()
    source = null
    stopWatchdog()
    status.value = 'closed'
  }

  return {
    status: readonly(status),
    connected,
    connect,
    disconnect,
  }
}
