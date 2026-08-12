import type { CurrentUser, ServerUserPayload, UserAccount } from './user'

// 菜单项触发方式
export type MenuActionType = 'action' | 'modal' | 'popper' | 'route'

// 服务器返回的菜单项原始结构
export interface ServerMenuItem {
  id: string
  type?: 'item' | 'widget' | 'divider'
  label?: string
  icon?: string
  action?: MenuActionType
  route?: string
  // 复杂小组件：如 "我的账户" 面板
  widget?: string
  // 任意扩展数据
  meta?: Record<string, any>
}

// 我的账户小组件元数据
export interface AccountWidgetMeta {
  credits?: number
  points?: number
  coins?: number
  signedIn?: boolean
  signInIcon?: string
}

// 统一菜单项
export interface MenuItem {
  id: string
  type: 'item' | 'widget' | 'divider'
  label?: string
  icon?: string
  action: MenuActionType
  route?: string
  widget?: string
  meta?: Record<string, any>
}

export interface ServerMenuPayload {
  items?: ServerMenuItem[]
  accounts?: ServerUserPayload[]
  widgetMeta?: Record<string, any>
}

export interface ParsedMenu {
  items: MenuItem[]
  accounts: UserAccount[]
  widgetMeta: Record<string, any>
}

const DEFAULT_MENU: ServerMenuItem[] = [
  { id: 'account-settings', label: '账号设置', icon: 'fa-user-gear', action: 'route', route: '/settings/account' },
  { id: 'edit-profile', label: '编辑资料', icon: 'fa-pen', action: 'route', route: '/settings/profile' },
  { id: 'switch-account', label: '切换账号', icon: 'fa-right-left', action: 'popper' },
  { id: 'logout', label: '退出登录', icon: 'fa-right-from-bracket', action: 'action' },
]

export function parseServerMenu(payload?: ServerMenuPayload | null): ParsedMenu {
  const rawItems = payload?.items ?? null
  const items: MenuItem[] = (rawItems ?? DEFAULT_MENU).map((it) => ({
    id: it.id,
    type: it.type ?? 'item',
    label: it.label,
    icon: it.icon,
    action: it.action ?? (it.route ? 'route' : 'action'),
    route: it.route,
    widget: it.widget,
    meta: it.meta ?? {},
  }))

  const accounts: UserAccount[] = (payload?.accounts ?? []).map((raw, idx) => ({
    id: raw.id || `account-${idx}`,
    displayName: raw.display_name || raw.displayName || raw.nickname || raw.username || '未命名',
    handle: raw.handle || raw.username || '@unknown',
    avatar: raw.avatar ?? null,
    isCurrent: false,
  }))

  return {
    items,
    accounts,
    widgetMeta: payload?.widgetMeta ?? {},
  }
}

export function normalizeAccounts(accounts: UserAccount[], currentId?: string): UserAccount[] {
  if (!accounts.length) return []
  return accounts.map((acc) => ({
    ...acc,
    handle: acc.handle.startsWith('@') ? acc.handle : `@${acc.handle}`,
    isCurrent: currentId ? acc.id === currentId : acc.isCurrent,
  }))
}

export type { CurrentUser, ServerUserPayload, UserAccount }
