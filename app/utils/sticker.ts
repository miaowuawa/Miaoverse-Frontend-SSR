// 贴纸工具：评论内嵌标记解析与上传安全校验。
//
// 安全说明（防 XSS / 上传图片藏 JS）：
// - 评论文本与贴纸名一律通过 Vue 文本插值（{{ }}）渲染，禁止 v-html；
// - 贴纸标记 [sticker:<uuid>] 解析为分段后，文本段仍以纯文本渲染（自动 HTML 转义），
//   不把用户输入拼进 HTML；
// - 贴纸图片只允许安全栅格格式（jpg/png/gif/webp），SVG 等可内嵌脚本的格式前端直接拒绝，
//   服务端还会按文件头魔数嗅探二次校验；
// - 图片地址只接受 http(s) 临时链接，一律用 <img> 渲染（不用内联 SVG / CSS background 注入）。

import type { CommentStickerInfo } from '~/types/comment'

/** 评论内嵌贴纸标记：[sticker:<uuid>]，一条评论最多 25 个（可重复使用同一张贴纸） */
export const STICKER_TOKEN_RE = /\[sticker:([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\]/g

/** 一条评论/回复最多使用的贴纸数（与后端 consts.MaxCommentStickerTokens 一致：25） */
export const MAX_COMMENT_STICKERS = 25

/** 允许上传的贴纸图片 MIME（安全栅格格式，明确排除 SVG） */
export const SUPPORTED_STICKER_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const

/** 单张贴纸最大字节数（与后端 upload.max_sticker_size_bytes 一致：10MB） */
export const MAX_STICKER_SIZE_BYTES = 10 * 1024 * 1024

/** 贴纸内嵌标记前缀（插入光标处使用） */
export function buildStickerToken(uuid: string): string {
  return `[sticker:${uuid}]`
}

/** 统计评论中贴纸标记数量（用于「一条评论最多 25 张贴纸」的插入上限校验） */
export function countStickerTokens(content: string): number {
  STICKER_TOKEN_RE.lastIndex = 0
  return (content.match(STICKER_TOKEN_RE) ?? []).length
}

/** 评论内容分段：文本段（纯文本渲染）与贴纸段（以 <img> 内联展示） */
export type CommentSegment =
  | { type: 'text'; text: string }
  | { type: 'sticker'; sticker: CommentStickerInfo }

/**
 * 把评论内容按贴纸标记解析为分段（多张贴纸随文字穿插展示）。
 * 标记处无贴纸信息（如服务端未返回）时仅跳过标记，文本其余部分保留。
 */
export function parseCommentSegments(
  content: string,
  stickers?: CommentStickerInfo[] | null
): CommentSegment[] {
  const byUuid = new Map<string, CommentStickerInfo>()
  for (const sticker of stickers ?? []) {
    const key = sticker.uuid.toLowerCase()
    if (!byUuid.has(key)) byUuid.set(key, sticker)
  }
  const segments: CommentSegment[] = []
  let lastIndex = 0
  STICKER_TOKEN_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = STICKER_TOKEN_RE.exec(content)) !== null) {
    const tokenStart = match.index
    const tokenEnd = tokenStart + match[0].length
    if (tokenStart > lastIndex) {
      segments.push({ type: 'text', text: content.slice(lastIndex, tokenStart) })
    }
    const sticker = byUuid.get(match[1].toLowerCase())
    if (sticker) {
      segments.push({ type: 'sticker', sticker })
    }
    lastIndex = tokenEnd
  }
  if (lastIndex < content.length) {
    segments.push({ type: 'text', text: content.slice(lastIndex) })
  }
  return segments
}

/** 校验远程图片地址只允许 http(s)（临时链接接口返回），拒绝 javascript:/data: 等可执行协议 */
export function isSafeRemoteUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/** 校验待上传的贴纸文件（类型白名单 + 大小限制），返回错误文案，null 表示通过 */
export function validateStickerFile(file: File): string | null {
  if (!SUPPORTED_STICKER_TYPES.includes(file.type as (typeof SUPPORTED_STICKER_TYPES)[number])) {
    return '贴纸仅支持 jpg/png/gif/webp 图片'
  }
  if (file.size > MAX_STICKER_SIZE_BYTES) {
    return '贴纸过大，单张最大 10MB'
  }
  return null
}
