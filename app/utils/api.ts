// 后端 API 客户端：统一走 /api/** 代理（见 nuxt.config.ts routeRules），
// 浏览器与 SSR 均同源请求，session cookie（mwu_sess_id）自动随请求携带。
import type { ServerUserPayload } from '~/types/user'
import type { MomentDetailData } from '~/components/MomentDetail.vue'
import type { CommentAuthor, CommentItemData, CommentStickerInfo, ReplyItemData } from '~/types/comment'

export interface ApiErrorBody {
  code: number
  msg: string
}

/** 评论作者（后端 resp.CommentInfo.author，为 user 表字段） */
export interface ServerCommentAuthor extends ServerUserPayload {
  bio?: string
  gender?: number
  region?: number
}

/** 评论内嵌贴纸展示信息（后端 resp.CommentSticker） */
export interface ServerCommentSticker {
  uuid: string
  file_uuid: string
  name: string
  hidden: boolean
}

/** 评论信息（后端 resp.CommentInfo） */
export interface ServerCommentInfo {
  id: number
  user_id: number
  moment_id: number
  content: string
  status: number
  created_at: string
  author?: ServerCommentAuthor
  likes?: number
  is_liked?: boolean
  /** 楼中楼回复总数（含全部子孙回复） */
  reply_count?: number
  /** 评论内嵌贴纸展示信息列表（按 content 中标记出现顺序，一条评论最多 25 张） */
  stickers?: ServerCommentSticker[]
}

/** 楼中楼回复信息（后端 resp.ReplyInfo） */
export interface ServerReplyInfo {
  id: number
  user_id: number
  moment_id: number
  /** 被回复的评论 id（楼中楼首条评论或楼中楼内任意回复） */
  reply_to_id: number
  /** 被回复的评论作者 id */
  reply_to_user_id: number
  content: string
  status: number
  created_at: string
  author?: ServerCommentAuthor
  likes?: number
  is_liked?: boolean
  /** 回复内嵌贴纸展示信息列表（语义与评论一致） */
  stickers?: ServerCommentSticker[]
}

/** 楼中楼完整对话（后端 resp.ConversationInfo） */
export interface ServerConversationInfo {
  root: ServerCommentInfo
  count: number
  replies: ServerReplyInfo[]
}

/** 贴纸信息（后端 resp.StickerInfo） */
export interface ServerStickerInfo {
  uuid: string
  file_uuid: string
  pack_id: number
  name: string
  source: number
  top: number
  created_at: string
}

/** 贴纸包信息（后端 resp.StickerPackInfo） */
export interface ServerStickerPackInfo {
  id: number
  uuid: string
  user_id: number
  name: string
  description: string
  banned: boolean
  sticker_count: number
  is_favorite: boolean
  created_at: string
}

/** 贴纸展示信息列表 → 前端展示数据 */
function normalizeStickers(list?: ServerCommentSticker[] | null): CommentStickerInfo[] {
  return (list ?? [])
    .filter((s) => !!s?.uuid)
    .map((s) => ({
      uuid: s.uuid,
      fileUuid: s.file_uuid,
      name: s.name,
      hidden: !!s.hidden,
    }))
}

/** 评论作者 → 前端展示数据 */
function normalizeCommentAuthor(raw: ServerCommentInfo | ServerReplyInfo): CommentAuthor {
  const authorRaw = raw.author
  return {
    id: authorRaw?.id ? String(authorRaw.id) : String(raw.user_id ?? ''),
    name: authorRaw?.display_name || authorRaw?.displayName || authorRaw?.nickname || '用户',
    handle: authorRaw?.handle || authorRaw?.username || '',
    avatar: authorRaw?.avatar ?? null,
  }
}

/** 后端评论 → 评论展示数据（贴纸标记 [sticker:<uuid>] 保留在 content 中随文字穿插展示） */
export function normalizeComment(raw: ServerCommentInfo): CommentItemData {
  return {
    id: String(raw.id),
    content: raw.content ?? '',
    createdAt: raw.created_at ?? '',
    likes: raw.likes ?? 0,
    isLiked: !!raw.is_liked,
    author: normalizeCommentAuthor(raw),
    stickers: normalizeStickers(raw.stickers),
    replyCount: raw.reply_count ?? 0,
    replies: null,
    repliesLoading: false,
    conversationLoaded: false,
  }
}

/** 后端回复 → 回复展示数据（楼中楼，含被回复对象信息） */
export function normalizeReply(raw: ServerReplyInfo): ReplyItemData {
  return {
    id: String(raw.id),
    content: raw.content ?? '',
    createdAt: raw.created_at ?? '',
    likes: raw.likes ?? 0,
    isLiked: !!raw.is_liked,
    author: normalizeCommentAuthor(raw),
    stickers: normalizeStickers(raw.stickers),
    replyToId: String(raw.reply_to_id ?? ''),
    replyToUserId: String(raw.reply_to_user_id ?? ''),
  }
}

export interface ReactionItem {
  emoji: string
  count: number
}

export interface ServerMomentPayload {
  id: string | number
  user_id?: number
  title?: string
  content?: string
  images?: string[]
  status?: number
  permission?: number
  comment_permission?: number
  top?: number
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

/** 上传成功返回的文件信息（POST /api/v1/user/files） */
export interface ServerFileInfo {
  uuid: string
  file_name: string
  file_url: string
  file_type: string
  file_ext: string
  mime_type: string
  file_size: number
  hash: string
  created_at: string
}

/** 发布/编辑动态返回（POST /api/v1/moment） */
export interface ServerMomentInfo {
  id: number
  user_id: number
  title: string
  content: string
  status: number
  permission: number
  comment_permission: number
  top: number
  created_at: string
  updated_at: string
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

  // 获取任意用户头像文件 UUID：GET /api/v1/user/users/:uid/avatar
  // 头像为公开可见文件，不受拉黑/屏蔽/账号封禁影响，无需登录
  getUserAvatar(uid: string | number) {
    return request<{ code: number; msg: string; avatar: { avatar_uuid: string } }>(`/api/v1/user/users/${encodeURIComponent(uid)}/avatar`)
  },

  // 设置当前登录用户头像：PUT /api/v1/user/avatar
  // avatar_uuid 必须是本人 active 图片文件且公开（permission=0）
  setAvatar(avatarUuid: string) {
    return request<{ code: number; msg: string; avatar: { avatar_uuid: string } }>('/api/v1/user/avatar', {
      method: 'PUT',
      body: { avatar_uuid: avatarUuid },
    })
  },

  // 给动态点赞：POST /api/v1/moment/likes（使用与现有后端一致的复数命名）
  // 注意：moment_id 必须为数字，后端按 uint64 解析，字符串会返回 400
  likeMoment(id: string) {
    return request<{ code: number; msg: string; target: number; action: string }>('/api/v1/moment/likes', {
      method: 'POST',
      body: { moment_id: Number(id) },
    })
  },

  // 取消动态点赞：DELETE /api/v1/moment/likes（幂等：后端按当前状态撤销）
  unlikeMoment(id: string) {
    return request<{ code: number; msg: string; target: number; action: string }>('/api/v1/moment/likes', {
      method: 'DELETE',
      body: { moment_id: Number(id) },
    })
  },

  // 关注用户：POST /api/v1/user/follows（幂等）。target 必须为数字，后端按 uint32 解析
  followUser(target: string | number) {
    return request<{ code: number; msg: string; target: number; action: string }>('/api/v1/user/follows', {
      method: 'POST',
      body: { target: Number(target) },
    })
  },

  // 取消关注：DELETE /api/v1/user/follows（幂等）
  unfollowUser(target: string | number) {
    return request<{ code: number; msg: string; target: number; action: string }>('/api/v1/user/follows', {
      method: 'DELETE',
      body: { target: Number(target) },
    })
  },

  // 给动态发送表情反应：POST /api/v1/moment/:id/reactions
  reactToMoment(id: string, emoji: string) {
    return request<{ code: number; msg: string; moment_id: string | number; emoji: string }>(`/api/v1/moment/${encodeURIComponent(id)}/reactions`, {
      method: 'POST',
      body: { emoji },
    })
  },

  // 上传文件：POST /api/v1/user/files（multipart/form-data）。
  // file_type 显式传 image，避免服务端按 MIME 误判；permission 默认不公开，
  // 动态图片不依赖文件分享权限（动态本身的可见权限已控制展示）。
  async uploadFile(file: File, fileType = 'image', permission = 2): Promise<ServerFileInfo> {
    const form = new FormData()
    form.append('file', file)
    form.append('file_type', fileType)
    form.append('permission', String(permission))
    let res
    try {
      res = await $fetch.raw<{ code: number; msg: string; file: ServerFileInfo }>('/api/v1/user/files', {
        method: 'POST',
        body: form,
        ignoreResponseError: true,
      })
    } catch (err: any) {
      throw parseApiError(err, '网络异常，请稍后重试')
    }
    const data = res._data ?? {}
    if (res.status !== 201) {
      throw new ApiRequestError(res.status, data.code ?? res.status, data.msg ?? '上传失败')
    }
    return data.file
  },

  // 发布动态：POST /api/v1/moment（JSON）
  publishMoment(payload: {
    content: string
    status?: number
    permission?: number
    comment_permission?: number
    top?: number
    file_uuids?: string[]
  }): Promise<{ code: number; msg: string; moment: ServerMomentInfo }> {
    return request('/api/v1/moment', {
      method: 'POST',
      body: payload,
    })
  },

  // 用户资料：GET /api/v1/user/users/:uid/info（需登录）
  // 安全：对路径参数 uid 做 encodeURIComponent，防止特殊字符破坏 URL 路径语义
  getUserInfo(uid: string | number) {
    return request<{ code: number; msg: string; user: ServerUserPayload }>(`/api/v1/user/users/${encodeURIComponent(uid)}/info`)
  },

  // 用户关系列表：GET /api/v1/user/users/:uid/followers 或 /following
  // 这里只取 count，limit=1 减少数据传输
  getUserFollowers(uid: string | number, offset = 0, limit = 1) {
    const query = new URLSearchParams({ offset: String(offset), limit: String(limit) })
    return request<{ code: number; msg: string; count: number; users: ServerUserPayload[] }>(`/api/v1/user/users/${encodeURIComponent(uid)}/followers?${query.toString()}`)
  },

  getUserFollowing(uid: string | number, offset = 0, limit = 1) {
    const query = new URLSearchParams({ offset: String(offset), limit: String(limit) })
    return request<{ code: number; msg: string; count: number; users: ServerUserPayload[] }>(`/api/v1/user/users/${encodeURIComponent(uid)}/following?${query.toString()}`)
  },

  // 用户内容列表：GET /api/v1/user/users/:uid/contents?category=&offset=&limit=（需登录）
  // 返回内容 ID/类型/互动计数（不含正文），正文需再调详情接口获取
  getUserContents(uid: string | number, category: 'moment' | 'article' | 'novel' = 'moment', offset = 0, limit = 20) {
    const query = new URLSearchParams({
      category,
      offset: String(offset),
      limit: String(limit),
    })
    return request<{ code: number; msg: string; count: number; contents: { id: number; type: string; comment: number; like: number; chapter_count: number }[] }>(`/api/v1/user/users/${encodeURIComponent(uid)}/contents?${query.toString()}`)
  },

  // 用户内容数量：GET /api/v1/user/users/:uid/contents/count（需登录）
  getUserContentsCount(uid: string | number) {
    return request<{ code: number; msg: string; count: number }>(`/api/v1/user/users/${encodeURIComponent(uid)}/contents/count`)
  },

  // 发表动态评论：POST /api/v1/comment/moments（需登录）
  // moment_id 必须为数字，后端按 uint64 解析；正文最大 1000 字（不含贴纸标记），
  // 可携带最多 25 个贴纸内嵌标记 [sticker:<uuid>] 随文字穿插展示（一条评论最多 25 张贴纸）
  createMomentComment(momentId: string | number, content: string) {
    return request<{ code: number; msg: string; comment: ServerCommentInfo }>('/api/v1/comment/moments', {
      method: 'POST',
      body: { moment_id: Number(momentId), content },
    })
  },

  // 回复评论（楼中楼）：POST /api/v1/comment/moments/:id/replies（需登录；:id 为被回复的评论 id）
  // 被回复对象既可以是楼中楼首条评论，也可以是楼中楼内任意回复（回复他人的回复），
  // 新回复归入以楼中楼首条评论为根的同一对话链；贴纸规则与评论一致（最多 25 张）
  createCommentReply(commentId: string | number, content: string) {
    return request<{ code: number; msg: string; reply: ServerReplyInfo }>(
      `/api/v1/comment/moments/${encodeURIComponent(String(commentId))}/replies`,
      { method: 'POST', body: { content } }
    )
  },

  // 动态评论列表：GET /api/v1/comment/moments/:id?offset=&limit=&sort=hot|time（需登录）
  // 评论 content 中保留贴纸标记，stickers 为贴纸展示信息（hidden=true 时提示「部分贴纸未显示」），
  // reply_count 为该评论楼中楼下的回复总数
  getMomentComments(momentId: string | number, offset = 0, limit = 20, sort: 'hot' | 'time' = 'hot') {
    const query = new URLSearchParams({ offset: String(offset), limit: String(limit), sort })
    return request<{ code: number; msg: string; count: number; comments: ServerCommentInfo[] }>(
      `/api/v1/comment/moments/${encodeURIComponent(String(momentId))}?${query.toString()}`
    )
  },

  // 楼中楼完整对话：GET /api/v1/comment/moments/:id/conversation（需登录；:id 为楼中楼首条评论 id）
  // 返回首条评论（root）及其全部子孙回复（replies，扁平列表按时间正序）；count 为该链全部回复总数
  getCommentConversation(commentId: string | number, offset = 0, limit = 100) {
    const query = new URLSearchParams({ offset: String(offset), limit: String(limit) })
    return request<{ code: number; msg: string; conversation: ServerConversationInfo }>(
      `/api/v1/comment/moments/${encodeURIComponent(String(commentId))}/conversation?${query.toString()}`
    )
  },

  // 给评论点赞 / 取消点赞（幂等）：POST/DELETE /api/v1/comment/likes（需登录）
  likeComment(commentId: string | number) {
    return request<{ code: number; msg: string; target: number; action: string }>('/api/v1/comment/likes', {
      method: 'POST',
      body: { comment_id: Number(commentId) },
    })
  },

  unlikeComment(commentId: string | number) {
    return request<{ code: number; msg: string; target: number; action: string }>('/api/v1/comment/likes', {
      method: 'DELETE',
      body: { comment_id: Number(commentId) },
    })
  },

  // ===== 贴纸（需登录且绑定手机号）=====

  // 上传贴纸：POST /api/v1/stickers（multipart/form-data，file + 可选 name）
  // 仅支持 jpg/png/gif/webp（服务端按文件头魔数嗅探校验），单张最大 10MB
  async uploadSticker(file: File, name?: string): Promise<ServerStickerInfo> {
    const form = new FormData()
    form.append('file', file)
    if (name) form.append('name', name)
    let res
    try {
      res = await $fetch.raw<{ code: number; msg: string; sticker: ServerStickerInfo }>('/api/v1/stickers', {
        method: 'POST',
        body: form,
        ignoreResponseError: true,
      })
    } catch (err: any) {
      throw parseApiError(err, '网络异常，请稍后重试')
    }
    const data = res._data ?? {}
    if (res.status !== 201) {
      throw new ApiRequestError(res.status, data.code ?? res.status, data.msg ?? '上传失败')
    }
    return data.sticker
  },

  // 我的贴纸收藏夹（我上传的 + 收藏的，置顶优先）：GET /api/v1/stickers/collection
  getStickerCollection(offset = 0, limit = 100) {
    const query = new URLSearchParams({ offset: String(offset), limit: String(limit) })
    return request<{ code: number; msg: string; count: number; stickers: ServerStickerInfo[] }>(
      `/api/v1/stickers/collection?${query.toString()}`
    )
  },

  // 添加他人贴纸到收藏夹（幂等，收藏上限 500）：POST /api/v1/stickers/collection
  favoriteSticker(stickerUuid: string) {
    return request<{ code: number; msg: string; sticker: ServerStickerInfo }>('/api/v1/stickers/collection', {
      method: 'POST',
      body: { sticker_uuid: stickerUuid },
    })
  },

  // 从收藏夹移除贴纸（幂等）：DELETE /api/v1/stickers/collection
  unfavoriteSticker(stickerUuid: string) {
    return request<{ code: number; msg: string; sticker: ServerStickerInfo }>('/api/v1/stickers/collection', {
      method: 'DELETE',
      body: { sticker_uuid: stickerUuid },
    })
  },

  // 设置/取消收藏夹贴纸置顶：PATCH /api/v1/stickers/:uuid/top（top: 1 置顶 / 0 取消）
  setStickerTop(stickerUuid: string, top: 0 | 1) {
    return request<{ code: number; msg: string; sticker: ServerStickerInfo }>(
      `/api/v1/stickers/${encodeURIComponent(stickerUuid)}/top`,
      { method: 'PATCH', body: { top } }
    )
  },

  // 贴纸包列表：GET /api/v1/stickers/packs?filter=all|favorite（用户收藏夹与其他贴纸包分开显示）
  getStickerPacks(offset = 0, limit = 20, filter: 'all' | 'favorite' = 'all') {
    const query = new URLSearchParams({ offset: String(offset), limit: String(limit), filter })
    return request<{ code: number; msg: string; count: number; packs: ServerStickerPackInfo[] }>(
      `/api/v1/stickers/packs?${query.toString()}`
    )
  },

  // 贴纸包详情（含包内贴纸）：GET /api/v1/stickers/packs/:id
  getStickerPackDetail(packId: string | number) {
    return request<{ code: number; msg: string; pack: ServerStickerPackInfo; stickers: ServerStickerInfo[] }>(
      `/api/v1/stickers/packs/${encodeURIComponent(String(packId))}`
    )
  },

  // 收藏/取消收藏整个贴纸包（幂等，收藏后包内容更新自动同步）：POST/DELETE /api/v1/stickers/packs/favorites
  favoriteStickerPack(packId: string | number) {
    return request<{ code: number; msg: string; pack: ServerStickerPackInfo }>('/api/v1/stickers/packs/favorites', {
      method: 'POST',
      body: { pack_id: Number(packId) },
    })
  },

  unfavoriteStickerPack(packId: string | number) {
    return request<{ code: number; msg: string; pack: ServerStickerPackInfo }>('/api/v1/stickers/packs/favorites', {
      method: 'DELETE',
      body: { pack_id: Number(packId) },
    })
  },

  // 用户内容流：GET /api/v1/feeds/user/:uid?content=&sort=&offset=&limit=
  // 支持本人查看（后端 AllowSelf），返回完整 feed 条目（含正文/作者/互动计数）。
  // 安全：对路径参数 uid 做 encodeURIComponent
  getUserFeed(uid: string | number, content: 'moment' | 'article' | 'novel' | 'all' = 'all', sort: 'time' | 'hot' = 'time', offset = 0, limit = 20) {
    const query = new URLSearchParams({
      content,
      sort,
      offset: String(offset),
      limit: String(limit),
    })
    return request<{ code: number; msg: string; count: number; items: ServerFeedItem[] }>(`/api/v1/feeds/user/${encodeURIComponent(uid)}?${query.toString()}`)
  },
}
