// 用户通知类型与展示模型（与后端 consts.NotifyType* / consts.NotifyCategory* 一一对应）。
//
// 前端分类（category）：account 账号、like 点赞、follow 关注、mention 提及、reply 回复；
// 列表页按分类分栏展示，导航小红点按分类统计未读数。
//
// 关联对象（target）：
// - kind=user（被关注通知指向关注者本人）→ 点击跳转用户主页 /user/:id
// - kind=moment（被点赞动态 / 被评论动态）→ 点击跳转动态详情 /moment/:id
// - kind=comment（被点赞评论 / 被回复评论）→ 当前无独立评论页，点击仅标记已读

export type NotificationCategory = 'account' | 'like' | 'follow' | 'mention' | 'reply'

/** 后端通知触发者（resp.NotifyInfo.actor，user 表字段） */
export interface ServerNotifyActor {
  id?: number
  username?: string
  nickname?: string
  avatar?: string | null
  status?: number
}

/** 后端通知记录（resp.NotifyInfo） */
export interface ServerNotification {
  id: number
  type: number
  category: NotificationCategory
  actor?: ServerNotifyActor | null
  target_type: number
  target_id: number
  content: string
  created_at: string
  read_at: string | null
  read: boolean
}

/** 后端各分类未读数（resp.NotifyUnread） */
export interface ServerNotifyUnread {
  total: number
  account: number
  like: number
  follow: number
  mention: number
  reply: number
}

/** SSE 推送事件载荷（resp.NotifyEvent） */
export interface ServerNotifyEvent {
  notify: ServerNotification
  unread: ServerNotifyUnread
}

/** 通知触发者展示数据 */
export interface NotificationActorData {
  id: string
  name: string
  avatar: string | null
}

/** 通知跳转目标 */
export interface NotificationTargetData {
  kind: 'moment' | 'user' | 'comment'
  id: string
}

/** 通知展示数据 */
export interface NotificationItemData {
  id: string
  category: NotificationCategory
  /** 标题：谁做了什么，如「张三 赞了你的动态」；账号类为「账号安全通知」 */
  title: string
  /** 摘要文本（评论/回复内容，或账号安全系统文案） */
  content: string
  createdAt: string
  read: boolean
  actor: NotificationActorData | null
  target: NotificationTargetData | null
}

// 与后端 consts.NotifyType* / consts.InteractTarget* 对应的数值常量
const NOTIFY_TYPE = {
  accountSecurity: 0,
  transaction: 1,
  like: 2,
  follow: 3,
  mention: 4,
  reply: 5,
} as const

const TARGET_TYPE = {
  user: 0,
  moment: 1,
  comment: 2,
} as const

/** 分类 → 列表展示用图标与配色（Tailwind 类） */
export function categoryMeta(category: NotificationCategory): { icon: string; color: string; label: string } {
  switch (category) {
    case 'like':
      return { icon: 'fa-heart', color: 'bg-red-500', label: '点赞' }
    case 'reply':
      return { icon: 'fa-comment', color: 'bg-blue-500', label: '回复' }
    case 'follow':
      return { icon: 'fa-user-plus', color: 'bg-green-500', label: '关注' }
    case 'mention':
      return { icon: 'fa-at', color: 'bg-purple-500', label: '提及' }
    case 'account':
    default:
      return { icon: 'fa-shield-halved', color: 'bg-gray-500', label: '账号' }
  }
}

/** 按通知类型与关联对象拼装标题动作文案（不含触发者昵称） */
function buildActionText(type: number, targetType: number): string {
  switch (type) {
    case NOTIFY_TYPE.like:
      if (targetType === TARGET_TYPE.comment) return '赞了你的评论'
      if (targetType === TARGET_TYPE.user) return '赞了你'
      return '赞了你的动态'
    case NOTIFY_TYPE.follow:
      return '关注了你'
    case NOTIFY_TYPE.mention:
      return '提到了你'
    case NOTIFY_TYPE.reply:
      if (targetType === TARGET_TYPE.comment) return '回复了你的评论'
      return '评论了你的动态'
    case NOTIFY_TYPE.accountSecurity:
      return '账号安全通知'
    case NOTIFY_TYPE.transaction:
      return '事务通知'
    default:
      return '通知'
  }
}

/** 后端通知 → 前端展示数据 */
export function normalizeNotification(raw: ServerNotification): NotificationItemData {
  const actorRaw = raw.actor
  const actor = actorRaw?.id
    ? {
        id: String(actorRaw.id),
        name: actorRaw.nickname || actorRaw.username || '用户',
        avatar: actorRaw.avatar ?? null,
      }
    : null

  const targetKind: NotificationTargetData['kind'] | null =
    raw.target_type === TARGET_TYPE.moment && raw.target_id
      ? 'moment'
      : raw.target_type === TARGET_TYPE.user && raw.target_id
        ? 'user'
        : raw.target_type === TARGET_TYPE.comment && raw.target_id
          ? 'comment'
          : null

  return {
    id: String(raw.id),
    category: raw.category,
    title: actor ? `${actor.name} ${buildActionText(raw.type, raw.target_type)}` : buildActionText(raw.type, raw.target_type),
    content: raw.content ?? '',
    createdAt: raw.created_at ?? '',
    read: !!raw.read,
    actor,
    target: targetKind ? { kind: targetKind, id: String(raw.target_id) } : null,
  }
}

/** 空未读数（登录前/初始化用） */
export function emptyUnread(): ServerNotifyUnread {
  return { total: 0, account: 0, like: 0, follow: 0, mention: 0, reply: 0 }
}

/** 分类 → 未读数字段取值 */
export function unreadOfCategory(unread: ServerNotifyUnread, category: NotificationCategory | ''): number {
  if (category === '') return unread.total
  return unread[category] ?? 0
}
