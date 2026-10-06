// 评论数据类型（与后端 resp.CommentInfo / resp.ReplyInfo / resp.CommentSticker 对接）

/** 评论作者展示信息 */
export interface CommentAuthor {
  id: string
  name: string
  handle: string
  avatar: string | null
}

/** 评论内嵌贴纸展示信息（hidden=true 表示贴纸无法显示，评论下提示「部分贴纸未显示」） */
export interface CommentStickerInfo {
  uuid: string
  /** 贴纸图片文件 UUID（原始存储 URL 不下发，展示前经临时链接接口换取） */
  fileUuid: string
  name: string
  hidden: boolean
}

/** 楼中楼回复展示数据（后端 resp.ReplyInfo） */
export interface ReplyItemData {
  id: string
  content: string
  createdAt: string
  likes: number
  isLiked: boolean
  author: CommentAuthor
  /** 回复内嵌贴纸（一条回复最多 25 张，按 content 中标记顺序展示） */
  stickers: CommentStickerInfo[]
  /** 被回复的评论 id（楼中楼首条评论或楼中楼内任意回复） */
  replyToId: string
  /** 被回复的评论作者 id */
  replyToUserId: string
}

/** 评论展示数据（一级评论，楼中楼以 replies 挂在评论下） */
export interface CommentItemData {
  id: string
  content: string
  createdAt: string
  likes: number
  isLiked: boolean
  author: CommentAuthor
  /** 评论内嵌贴纸（一条评论最多 25 张，按 content 中标记顺序展示） */
  stickers: CommentStickerInfo[]
  /** 楼中楼回复总数（含全部子孙回复，后端 reply_count） */
  replyCount: number
  /** 楼中楼回复列表（null=尚未加载；查看完整对话后为该链全部回复） */
  replies: ReplyItemData[] | null
  /** 楼中楼回复是否加载中 */
  repliesLoading: boolean
  /** 是否已加载完整对话（该链下全部回复） */
  conversationLoaded: boolean
}
