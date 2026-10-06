<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'nuxt/app'
import SidebarLeft from '~/components/container/SidebarLeft.vue'
import SidebarRight from '~/components/container/SidebarRight.vue'
import LoginModal from '~/components/modal/LoginModal.vue'
import AccountSelectorModal from '~/components/modal/AccountSelectorModal.vue'
import SearchModal from '~/components/modal/SearchModal.vue'
import MomentDetail, { type MomentDetailData } from '~/components/MomentDetail.vue'
import InfoModal from '~/components/modal/InfoModal.vue'
import CommentModal from '~/components/modal/CommentModal.vue'
import { api, ApiRequestError, normalizeComment, normalizeReply } from '~/utils/api'
import { notifyError, withCode } from '~/utils/notify'
import type { MenuItem, ServerMenuPayload } from '~/types/menu'
import type { MultipleAccountChoice } from '~/types/user'
import type { CommentItemData, ReplyItemData } from '~/types/comment'

const route = useRoute()
const router = useRouter()
// 安全：将路由参数强制转为字符串，避免非字符串 ID 被直接用于模板/请求
const momentId = String(route.params.id || '')

useHead({
  title: '动态详情 - Miaoverse',
})

// SSR 阶段不请求详情，避免服务端与客户端状态不一致
const moment = ref<MomentDetailData | null>(null)
const loading = ref(false)

// 评论列表（一级评论，含贴纸穿插展示信息）
const comments = ref<CommentItemData[]>([])
const commentsTotal = ref(0)
const commentsLoading = ref(false)
const commentSort = ref<'hot' | 'time'>('hot')

// 动态详情加载失败（拉黑/被屏蔽/账号封禁/不可见等）时展示的提示
const showInfo = ref(false)
const infoContent = ref('')

// 拉黑（40301）、内容屏蔽（45101）、账号封禁（40303）、404 不可见等均属于"用户可理解的失败场景"，
// 统一通过 InfoModal 提示，确认后返回上一页或首页，不再回退 mock 数据。
function canGoBack(): boolean {
  return typeof window !== 'undefined' && window.history.length > 1
}

function leaveMomentPage(): void {
  if (canGoBack()) {
    router.back()
  } else {
    router.replace('/')
  }
}

const handleInfoConfirm = () => {
  leaveMomentPage()
}

function failWithInfo(err: unknown, fallbackMsg: string): void {
  let msg = fallbackMsg
  let code: number | null = null
  if (err instanceof ApiRequestError) {
    msg = err.message || fallbackMsg
    code = err.customCode
  } else if (err instanceof Error) {
    msg = err.message || fallbackMsg
  }
  infoContent.value = withCode(msg, code)
  showInfo.value = true
}

async function fetchMomentDetail(id: string): Promise<MomentDetailData> {
  // 安全：对拼接进 URL 的 ID 做 encodeURIComponent，防止路径注入
  return await api.getMomentDetail(id)
}

// 详情接口返回的 images 为文件 UUID 列表（原始存储 URL 不下发），
// 逐张换取临时访问 URL；换取失败（如未公开分享）的图片静默跳过
async function resolveDetailImages(moment: MomentDetailData): Promise<void> {
  if (!moment.images || moment.images.length === 0) return
  const urls: string[] = []
  for (const uuid of moment.images) {
    try {
      const res = await api.getFileTempLink(uuid)
      if (res.link?.url) {
        urls.push(res.link.url)
      }
    } catch {
      // 单张图片换取失败不影响其余图片展示
    }
  }
  moment.images = urls
}

// 拉取评论列表（一级评论）。未登录（401）时静默降级为空列表，评论区显示占位
async function fetchComments(append = false): Promise<void> {
  if (!momentId) return
  commentsLoading.value = true
  try {
    const res = await api.getMomentComments(momentId, append ? comments.value.length : 0, 20, commentSort.value)
    const items = (res.comments ?? []).map(normalizeComment)
    comments.value = append ? [...comments.value, ...items] : items
    commentsTotal.value = res.count ?? comments.value.length
  } catch (err) {
    if (!(err instanceof ApiRequestError && err.httpStatus === 401)) {
      notifyError(err, '获取评论失败')
    }
  } finally {
    commentsLoading.value = false
  }
}

onMounted(async () => {
  if (!momentId) {
    failWithInfo(null, '动态 ID 缺失')
    return
  }
  loading.value = true
  try {
    const detail = await fetchMomentDetail(momentId)
    await resolveDetailImages(detail)
    moment.value = detail
  } catch (err) {
    failWithInfo(err, '获取动态详情失败')
  } finally {
    loading.value = false
  }
  fetchComments()
})

// ========== 与首页一致的布局/登录/搜索/发布/账号切换状态 ==========
const auth = useAuth()
const { currentUser, isLoggedIn } = auth

const showLoginModal = ref(false)
const showSearchModal = ref(false)
const showSwitchAccountModal = ref(false)
const switchAccountChoices = ref<MultipleAccountChoice[]>([])
const loginModalRef = ref<InstanceType<typeof LoginModal> | null>(null)

const serverMenu = ref<ServerMenuPayload | null>({
  items: [
    { id: 'account-settings', label: '账号设置', icon: 'fa-user-gear', action: 'route', route: '/settings/account' },
    { id: 'edit-profile', label: '编辑资料', icon: 'fa-pen', action: 'route', route: '/settings/profile' },
    { id: 'placeholder-1', label: '占位设置项', icon: 'fa-user-gear', action: 'modal' },
    { id: 'placeholder-2', label: '占位设置项', icon: 'fa-user-gear', action: 'modal' },
    { id: 'placeholder-3', label: '占位设置项', icon: 'fa-user-gear', action: 'modal' },
    { id: 'my-account', type: 'widget', widget: 'account' },
    { id: 'switch-account', label: '切换账号', icon: 'fa-right-left', action: 'popper' },
    { id: 'logout', label: '退出登录', icon: 'fa-right-from-bracket', action: 'action' },
  ],
  accounts: currentUser.value
    ? [{
        id: currentUser.value.id,
        display_name: currentUser.value.displayName,
        handle: currentUser.value.handle.replace('@', ''),
        avatar: currentUser.value.avatar,
      }]
    : [],
  widgetMeta: {
    credits: 2000,
    points: 2100,
    coins: 1000,
    signedIn: false,
    signInIcon: 'fa-gift',
  },
})

const handleLogin = () => {
  showLoginModal.value = true
}

const handleLoginSubmit = async (data: { phone: string; region: number; uuid: string; code: number }) => {
  try {
    const result = await auth.loginBySMS(data)
    if (result.type === 'multiple_choices') {
      loginModalRef.value?.openAccountSelector(result.choices)
      return
    }
    showLoginModal.value = false
  } catch (err) {
    loginModalRef.value?.finishLogin(err)
  }
}

const handleAccountSelected = async (choice: MultipleAccountChoice) => {
  try {
    await auth.confirmLoginByChoice(choice)
    showLoginModal.value = false
  } catch (err) {
    loginModalRef.value?.finishLogin(err)
  }
}

const handleSwitchAccount = async () => {
  showSwitchAccountModal.value = true
  switchAccountChoices.value = []
  try {
    switchAccountChoices.value = await auth.fetchMyAccounts()
  } catch (err) {
    notifyError(err, '获取账号列表失败，请稍后重试')
  }
}

const handleSwitchAccountConfirm = async (choice: MultipleAccountChoice) => {
  try {
    await auth.switchAccount(choice)
    showSwitchAccountModal.value = false
  } catch (err) {
    notifyError(err, '切换账号失败，请稍后重试')
  }
}

const handleLogout = async () => {
  await auth.logout()
}

const handleSearch = () => {
  showSearchModal.value = true
}

const handleSearchSubmit = (keyword: string) => {
  console.log('Search:', keyword)
}

const handleSearchSelect = (item: any) => {
  console.log('Select:', item)
}

const handleMenuAction = (item: MenuItem) => {
  if (item.route) {
    navigateTo(item.route)
  }
}

const handleSignIn = () => {
  console.log('签到')
}

// ========== 动态详情事件 ==========
const handleBack = () => {
  router.back()
}

const handleFollow = async (userId: string) => {
  if (!moment.value) return
  try {
    await api.followUser(userId)
    moment.value.isFollowing = true
  } catch (err) {
    notifyError(err, '关注失败')
  }
}

const handleUnfollow = async (userId: string) => {
  if (!moment.value) return
  try {
    await api.unfollowUser(userId)
    moment.value.isFollowing = false
  } catch (err) {
    notifyError(err, '取消关注失败')
  }
}

// 点赞请求进行中标记：后端点赞幂等，快速连点时避免前端计数虚高
const likePending = ref(false)

const handleLike = async (id: string) => {
  if (!moment.value || likePending.value) return
  likePending.value = true
  try {
    await api.likeMoment(id)
    if (moment.value && !moment.value.isLiked) {
      moment.value.stats.likes++
      moment.value.isLiked = true
    }
  } catch (err) {
    notifyError(err, '点赞失败')
  } finally {
    likePending.value = false
  }
}

const handleUnlike = async (id: string) => {
  if (!moment.value || likePending.value) return
  likePending.value = true
  try {
    await api.unlikeMoment(id)
    if (moment.value && moment.value.isLiked) {
      moment.value.stats.likes = Math.max(0, moment.value.stats.likes - 1)
      moment.value.isLiked = false
    }
  } catch (err) {
    notifyError(err, '取消点赞失败')
  } finally {
    likePending.value = false
  }
}

// 评论输入弹窗
const showCommentModal = ref(false)
// 回复目标（楼中楼）：null=对动态发表评论；否则回复某条评论/某条回复
const replyTarget = ref<{ rootId: string; targetId: string; targetName: string } | null>(null)

const handleComment = (id: string) => {
  replyTarget.value = null
  showCommentModal.value = true
}

// 回复评论/回复他人的回复：打开回复输入弹窗
const handleReply = (payload: { rootId: string; targetId: string; targetName: string }) => {
  replyTarget.value = payload
  showCommentModal.value = true
}

// 楼中楼首次展开：加载该链前若干条回复
const REPLY_PREVIEW_SIZE = 10

const handleExpandReplies = async (rootId: string) => {
  const comment = comments.value.find((c) => c.id === rootId)
  if (!comment || comment.repliesLoading || comment.replies !== null) return
  comment.repliesLoading = true
  try {
    const res = await api.getCommentConversation(rootId, 0, REPLY_PREVIEW_SIZE)
    const replies = (res.conversation.replies ?? []).map(normalizeReply)
    comment.replies = replies
    comment.replyCount = Math.max(comment.replyCount, res.conversation.count ?? replies.length)
    if (replies.length >= comment.replyCount) {
      comment.conversationLoaded = true
    }
  } catch (err) {
    notifyError(err, '获取回复失败')
  } finally {
    comment.repliesLoading = false
  }
}

// 查看完整对话：一键加载该链下全部评论回复（分页拉取直到取完）
const handleShowConversation = async (rootId: string) => {
  const comment = comments.value.find((c) => c.id === rootId)
  if (!comment || comment.repliesLoading) return
  comment.repliesLoading = true
  try {
    const replies: ReplyItemData[] = []
    let offset = 0
    let total = 0
    for (;;) {
      const res = await api.getCommentConversation(rootId, offset, 100)
      total = res.conversation.count ?? 0
      const page = (res.conversation.replies ?? []).map(normalizeReply)
      replies.push(...page)
      if (page.length === 0 || replies.length >= total) break
      offset += page.length
    }
    comment.replies = replies
    comment.replyCount = Math.max(comment.replyCount, total)
    comment.conversationLoaded = true
  } catch (err) {
    notifyError(err, '获取完整对话失败')
  } finally {
    comment.repliesLoading = false
  }
}

// 评论/回复发送成功：评论刷新列表并计数 +1；回复插入对应楼中楼并回复数 +1
const handleCommentSent = (payload?: { rootId: string; reply: ReplyItemData }) => {
  if (payload?.rootId) {
    const comment = comments.value.find((c) => c.id === payload.rootId)
    if (comment) {
      comment.replyCount++
      if (comment.replies) {
        comment.replies.push(payload.reply)
      }
    }
    return
  }
  if (moment.value) {
    moment.value.stats.comments++
  }
  fetchComments()
}

// 楼中楼回复点赞/取消点赞（后端幂等）
const handleLikeReply = async (payload: { rootId: string; replyId: string }) => {
  try {
    await api.likeComment(payload.replyId)
    const reply = comments.value.find((c) => c.id === payload.rootId)?.replies?.find((r) => r.id === payload.replyId)
    if (reply && !reply.isLiked) {
      reply.likes++
      reply.isLiked = true
    }
  } catch (err) {
    notifyError(err, '点赞失败')
  }
}

const handleUnlikeReply = async (payload: { rootId: string; replyId: string }) => {
  try {
    await api.unlikeComment(payload.replyId)
    const reply = comments.value.find((c) => c.id === payload.rootId)?.replies?.find((r) => r.id === payload.replyId)
    if (reply && reply.isLiked) {
      reply.likes = Math.max(0, reply.likes - 1)
      reply.isLiked = false
    }
  } catch (err) {
    notifyError(err, '取消点赞失败')
  }
}

// 评论点赞/取消点赞（后端幂等）
const handleLikeComment = async (id: string) => {
  try {
    await api.likeComment(id)
    const found = comments.value.find((c) => c.id === id)
    if (found && !found.isLiked) {
      found.likes++
      found.isLiked = true
    }
  } catch (err) {
    notifyError(err, '点赞失败')
  }
}

const handleUnlikeComment = async (id: string) => {
  try {
    await api.unlikeComment(id)
    const found = comments.value.find((c) => c.id === id)
    if (found && found.isLiked) {
      found.likes = Math.max(0, found.likes - 1)
      found.isLiked = false
    }
  } catch (err) {
    notifyError(err, '取消点赞失败')
  }
}

const handleLoadMoreComments = () => {
  fetchComments(true)
}

const handleShare = (id: string) => {
  // TODO: 打开分享面板/复制链接
  console.log('share', id)
}

const handleReaction = async (payload: { id: string; emoji: string }) => {
  if (!moment.value?.reactions) return
  try {
    await api.reactToMoment(payload.id, payload.emoji)
    const found = moment.value.reactions.find((r) => r.emoji === payload.emoji)
    if (found) {
      found.count++
    } else {
      moment.value.reactions.push({ emoji: payload.emoji, count: 1 })
    }
  } catch (err) {
    notifyError(err, '发送表情反应失败')
  }
}

const handleSortChange = (sort: 'hot' | 'time') => {
  if (commentSort.value === sort) return
  commentSort.value = sort
  comments.value = []
  fetchComments()
}

const handleUserClick = (userId: string) => {
  navigateTo(`/user/${encodeURIComponent(userId)}`)
}
</script>

<template>
  <div class="flex min-h-screen bg-bg-light">
    <!-- 左侧边栏 -->
    <SidebarLeft
      :current-user="currentUser"
      :server-menu="serverMenu"
      @login="handleLogin"
      @search="handleSearch"
      @logout="handleLogout"
      @switch-account="handleSwitchAccount"
      @menu-action="handleMenuAction"
      @sign-in="handleSignIn"
    />

    <!-- 中间内容区 -->
    <main class="flex-1 ml-64" :class="{ 'mr-80': isLoggedIn }">
      <div v-if="loading" class="min-h-screen flex items-center justify-center">
        <div class="flex items-center gap-2 text-gray-400">
          <i class="fa-solid fa-circle-notch fa-spin"></i>
          <span>加载中...</span>
        </div>
      </div>

      <MomentDetail
        v-else-if="moment"
        :moment="moment"
        :comments="comments"
        :comments-total="commentsTotal"
        :comments-loading="commentsLoading"
        @back="handleBack"
        @search="handleSearch"
        @follow="handleFollow"
        @unfollow="handleUnfollow"
        @like="handleLike"
        @unlike="handleUnlike"
        @comment="handleComment"
        @share="handleShare"
        @reaction="handleReaction"
        @sort-change="handleSortChange"
        @user-click="handleUserClick"
        @like-comment="handleLikeComment"
        @unlike-comment="handleUnlikeComment"
        @load-more-comments="handleLoadMoreComments"
        @reply="handleReply"
        @like-reply="handleLikeReply"
        @unlike-reply="handleUnlikeReply"
        @expand-replies="handleExpandReplies"
        @show-conversation="handleShowConversation"
      />
    </main>

    <!-- 右侧边栏 -->
    <SidebarRight v-if="isLoggedIn" />

    <!-- 登录对话框 -->
    <LoginModal
      ref="loginModalRef"
      v-model:visible="showLoginModal"
      :current-user="currentUser"
      @login="handleLoginSubmit"
      @select-account="handleAccountSelected"
    />

    <!-- 搜索对话框 -->
    <SearchModal
      v-model:visible="showSearchModal"
      @search="handleSearchSubmit"
      @select="handleSearchSelect"
    />

    <!-- 切换账号选择窗口 -->
    <AccountSelectorModal
      v-model:visible="showSwitchAccountModal"
      mode="switch"
      :phone="currentUser?.handle ?? ''"
      :choices="switchAccountChoices"
      :current-user="currentUser"
      @confirm="handleSwitchAccountConfirm"
    />

    <!-- 查看动态失败提示（拉黑/被屏蔽/账号封禁/不可见等），确认后返回上一页或首页 -->
    <InfoModal
      v-model:visible="showInfo"
      title="查看动态失败"
      :content="infoContent"
      confirm-text="好的"
      @confirm="handleInfoConfirm"
    />

    <!-- 评论/回复输入弹窗：点击动态评论按钮或评论回复按钮后从底部滑出 -->
    <CommentModal
      v-model:visible="showCommentModal"
      :moment-id="momentId"
      :current-user="currentUser"
      :reply-target="replyTarget"
      @sent="handleCommentSent"
    />
  </div>
</template>
