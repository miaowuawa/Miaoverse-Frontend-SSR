// 后端 API 客户端：统一走 /api/** 代理（见 nuxt.config.ts routeRules），
// 浏览器与 SSR 均同源请求，session cookie（mwu_sess_id）自动随请求携带。
import type { ServerUserPayload } from '~/types/user'
import type { MomentDetailData } from '~/components/MomentDetail.vue'

export interface ApiErrorBody {
  code: number
  msg: string
}

export interface ReactionItem {
  emoji: string
  count: number
}

export interface ServerMomentPayload {
  id: string | number
  user_id?: number
  content?: string
  images?: string[]
  created_at?: string
  updated_at?: string
  author?: ServerUserPayload
  stats?: {
    likes?: number
    comments?: number
    shares?: number
  }
  reactions?: ReactionItem[]
  is_liked?: boolean
  is_following?: boolean
}

// 时间线 feed 条目（动态与文章统一结构，见后端 resp.FeedItem）
export interface ServerFeedItem {
  id: string | number
  type?: 'moment' | 'article'
  user_id?: number
  title?: string
  content?: string
  description?: string
  cover?: string
  images?: string[]
  created_at?: string
  updated_at?: string
  author?: ServerUserPayload
  stats?: {
    likes?: number
    comments?: number
    shares?: number
  }
  is_liked?: boolean
  is_following?: boolean
  full?: boolean
}

export function normalizeMomentDetail(raw: ServerMomentPayload): MomentDetailData {
  const authorRaw = raw.author
  const id = String(raw.id ?? '')
  const author: MomentDetailData['author'] = {
    id: authorRaw?.id ? String(authorRaw.id) : id,
    name: authorRaw?.display_name || authorRaw?.displayName || authorRaw?.nickname || '用户',
    handle: authorRaw?.handle || authorRaw?.username,
    avatar: authorRaw?.avatar ?? null,
    verified: false,
  }
  const stats = {
    likes: raw.stats?.likes ?? 0,
    comments: raw.stats?.comments ?? 0,
    shares: raw.stats?.shares ?? 0,
  }
  return {
    id,
    content: raw.content ?? '',
    images: raw.images ?? [],
    author,
    publishTime: raw.created_at ?? '',
    stats,
    reactions: raw.reactions ?? [],
    isLiked: raw.is_liked ?? false,
    isFollowing: raw.is_following ?? false,
    isSelf: false,
  }
}

export class ApiRequestError extends Error {
  /** HTTP 状态码 */
  httpStatus: number
  /** 业务自定义错误码（与 HTTP 状态码不同时存在，如 40301/40302） */
  customCode: number | null

  constructor(httpStatus: number, bodyCode: number, msg: string) {
    super(msg)
    this.name = 'ApiRequestError'
    this.httpStatus = httpStatus
    this.customCode = bodyCode !== httpStatus ? bodyCode : null
  }
}

// 从 $fetch 抛出的错误中解析后端响应结构（body 可能携带自定义业务 code）
function parseApiError(err: any, fallbackMsg: string): ApiRequestError {
  const data = err?.data as ApiErrorBody | undefined
  const httpStatus = err?.statusCode ?? 500
  const bodyCode = typeof data?.code === 'number' ? data.code : httpStatus
  const msg = data?.msg || fallbackMsg
  return new ApiRequestError(httpStatus, bodyCode, msg)
}

// 生成后端要求的 `a` 参数：当前毫秒时间戳平方后反转十进制字符串
function buildA(): string {
  const ts = BigInt(Date.now())
  return (ts * ts).toString().split('').reverse().join('')
}

async function request<T>(url: string, options: { method?: string; body?: Record<string, unknown> } = {}): Promise<T> {
  try {
    return await $fetch<T>(url, {
      method: options.method ?? 'GET',
      body: options.body,
    })
  } catch (err: any) {
    throw parseApiError(err, '网络异常，请稍后重试')
  }
}

export interface SmsLoginResult {
  type: 'success' | 'multiple_choices'
  uid?: number
  msg: string
  users?: ServerUserPayload[]
}

export const api = {
  sendSmsCode(phone: string, region = '86') {
    return request<{ code_uuid: string; msg: string }>('/api/v1/auth/sms/send', {
      method: 'POST',
      body: { phone, region, a: buildA() },
    })
  },

  // 短信登录：200/201 为登录成功，300 为多账号待选择，其余为错误
  async loginBySms(payload: { phone: string; region: number; uuid: string; code: number }): Promise<SmsLoginResult> {
    const res = await $fetch.raw<ApiErrorBody & { uid?: number; users?: ServerUserPayload[] }>(
      '/api/v1/auth/login/sms',
      {
        method: 'POST',
        body: { ...payload, a: buildA() },
        ignoreResponseError: true,
      }
    )
    const data = res._data ?? {}
    if (res.status === 200 || res.status === 201) {
      return { type: 'success', uid: data.uid, msg: data.msg ?? '' }
    }
    if (res.status === 300) {
      return { type: 'multiple_choices', users: data.users ?? [], msg: data.msg ?? '' }
    }
    throw new ApiRequestError(res.status, data.code ?? res.status, data.msg ?? '登录失败，请稍后重试')
  },

  chooseAccount(uid: number) {
    return request<{ code: number; msg: string; uid: number }>('/api/v1/auth/login/choose', {
      method: 'POST',
      body: { uid },
    })
  },

  logout() {
    return request<{ code: number; msg: string }>('/api/v1/auth/logout', { method: 'POST' })
  },

  // 当前会话手机号绑定的可登录账号列表（含 current 当前登录 uid）
  listAccounts() {
    return request<{ code: number; msg: string; current: number; users: ServerUserPayload[] }>('/api/v1/auth/accounts')
  },

  // 切换到同一手机号下的另一个账号
  switchAccount(uid: number) {
    return request<{ code: number; msg: string; uid: number }>('/api/v1/auth/switch', {
      method: 'POST',
      body: { uid },
    })
  },

  me() {
    return request<{ code: number; msg: string; user: ServerUserPayload }>('/api/v1/user/me')
  },

  // 动态详情：GET /api/v1/moments/:id
  async getMomentDetail(id: string): Promise<MomentDetailData> {
    // 安全：对路径参数做 encodeURIComponent，防止 ID 中的特殊字符破坏 URL 路径语义
    const res = await request<{ code: number; msg: string; moment: ServerMomentPayload }>(`/api/v1/moments/${encodeURIComponent(id)}`)
    return normalizeMomentDetail(res.moment)
  },

  // 时间线 feed：GET /api/v1/feeds/timeline?content=moment&offset=&limit=（无需登录）
  // 首页只展示动态；分页 limit 由调用方显式传入，避免默认 20 条被误用
  getFeedTimeline(offset = 0, limit = 20) {
    const query = new URLSearchParams({
      content: 'moment',
      offset: String(offset),
      limit: String(limit),
    })
    return request<{ code: number; msg: string; count: number; items: ServerFeedItem[] }>(`/api/v1/feeds/timeline?${query.toString()}`)
  },

  // 文件临时访问链接：GET /api/v1/user/files/:uuid/shared-link
  // 未登录仅可换取公开（permission=0）文件的链接；不返回原始存储 URL
  getFileTempLink(uuid: string) {
    return request<{ code: number; msg: string; link: { uuid: string; url: string; expires_at: string } }>(`/api/v1/user/files/${encodeURIComponent(uuid)}/shared-link`)
  },

  // 给动态点赞：POST /api/v1/moment/likes（使用与现有后端一致的复数命名）
  likeMoment(id: string) {
    return request<{ code: number; msg: string; target: number; action: string }>('/api/v1/moment/likes', {
      method: 'POST',
      body: { moment_id: id },
    })
  },

  // 取消动态点赞：POST /api/v1/moment/likes（幂等：后端按当前状态撤销）
  // 注：后端目前 LikeMomentAndMeta/UnlikeMomentAndMeta 为两个 DAO 方法；这里预留与后端对接的占位，
  //     当前阶段与 likeMoment 调用同一接口，待后端支持取消后再切换。
  unlikeMoment(id: string) {
    return request<{ code: number; msg: string; target: number; action: string }>('/api/v1/moment/likes', {
      method: 'POST',
      body: { moment_id: id },
    })
  },

  // 给动态发送表情反应：POST /api/v1/moment/:id/reactions
  reactToMoment(id: string, emoji: string) {
    return request<{ code: number; msg: string; moment_id: string | number; emoji: string }>(`/api/v1/moment/${encodeURIComponent(id)}/reactions`, {
      method: 'POST',
      body: { emoji },
    })
  },
}
