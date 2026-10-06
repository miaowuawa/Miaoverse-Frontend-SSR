// 楼中楼（链式回复）展示工具：根据扁平回复列表的 reply_to_id 计算各回复相对首条评论的嵌套层数。
//
// 约定：
// - 首条评论（楼中楼根）为 0 层，直接回复首条评论的回复为 1 层，回复某条回复则层数 +1。
// - 预览态只展示不超过 MAX_INLINE_REPLY_DEPTH 层的回复；更深的回复由「查看完整对话」入口加载展示。
// - 父节点缺失（父回复已删除等）时按 1 层处理，避免回复从列表中消失。
import type { ReplyItemData } from '~/types/comment'

/** 楼中楼预览态最大展示层数；超过该层数的链式对话在首条评论处提供「查看完整对话」。 */
export const MAX_INLINE_REPLY_DEPTH = 3

/**
 * 计算扁平回复列表相对根评论的嵌套层数。
 * 回复按时间正序返回，父回复必然先于子回复出现，因此一次顺序遍历即可解析。
 * @param rootId 楼中楼首条评论 id
 * @param replies 扁平回复列表（reply_to_id 指向上一环）
 * @returns replyId → 层数（根为 0）
 */
export function resolveReplyDepths(rootId: string, replies: ReplyItemData[]): Map<string, number> {
  const depths = new Map<string, number>()
  depths.set(rootId, 0)
  for (const reply of replies) {
    const parentDepth = depths.get(reply.replyToId)
    depths.set(reply.id, parentDepth === undefined ? 1 : parentDepth + 1)
  }
  return depths
}

/** 扁平回复列表相对根评论的最大嵌套层数（无回复返回 0）。 */
export function maxReplyDepth(rootId: string, replies: ReplyItemData[]): number {
  let max = 0
  for (const depth of resolveReplyDepths(rootId, replies).values()) {
    if (depth > max) max = depth
  }
  return max
}
