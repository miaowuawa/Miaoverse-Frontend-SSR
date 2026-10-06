<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'nuxt/app'
import SidebarLeft from '~/components/container/SidebarLeft.vue'
import SidebarRight from '~/components/container/SidebarRight.vue'
import LoginModal from '~/components/modal/LoginModal.vue'
import AccountSelectorModal from '~/components/modal/AccountSelectorModal.vue'
import SearchModal from '~/components/modal/SearchModal.vue'
import InfoModal from '~/components/modal/InfoModal.vue'
import Moments from '~/components/Moments.vue'
import AvatarImg from '~/components/AvatarImg.vue'
import { api, ApiRequestError, type ServerFeedItem, type ServerUserPayload } from '~/utils/api'
import { notifyError, withCode } from '~/utils/notify'
import { formatRelativeTime } from '~/utils/time'
import type { MenuItem, ServerMenuPayload } from '~/types/menu'
import type { MultipleAccountChoice } from '~/types/user'

const route = useRoute()
const router = useRouter()

// 安全：强制将路由参数转为字符串并做 encodeURIComponent 防护，避免特殊字符注入 URL 路径或模板
const rawUserId = String(route.params.id || '')
const encodedUserId = encodeURIComponent(rawUserId)
// 当前正在查看的用户 id（路由切换到其他用户主页时更新）
const viewingUserId = ref(rawUserId)

useHead({
  title: '用户主页 - Miaoverse',
})

// ===== 页面状态 =====
const loading = ref(false)
const feedLoading = ref(false)
const user = ref<ServerUserPayload | null>(null)
const isFollowing = ref(false)
const isSelf = ref(false)
const stats = ref({
  followers: 0,
  following: 0,
  likes: 0,
  friends: 0,
  moments: 0,
  articles: 0,
  novels: 0,
  comments: 0,
})
const feedItems = ref<ServerFeedItem[]>([])
const feedOffset = ref(0)
const feedLimit = 20
const feedHasMore = ref(true)

// 顶部标签：动态 / 文章 / 小说 / 评论
const activeTab = ref<'moment' | 'article' | 'novel' | 'comment'>('moment')

// 失败提示弹窗（与动态详情页一致：访问失败时使用 InfoModal 提示）
const showInfo = ref(false)
const infoContent = ref('')
const infoTitle = ref('访问用户失败')

function canGoBack(): boolean {
  return typeof window !== 'undefined' && window.history.length > 1
}

function leavePage(): void {
  if (canGoBack()) {
    router.back()
  } else {
    router.replace('/')
  }
}

const handleInfoConfirm = () => {
  showInfo.value = false
  leavePage()
}

function failWithInfo(err: unknown, fallbackMsg: string, title = '访问用户失败'): void {
  let msg = fallbackMsg
  let code: number | null = null
  if (err instanceof ApiRequestError) {
    msg = err.message || fallbackMsg
    code = err.customCode
  } else if (err instanceof Error) {
    msg = err.message || fallbackMsg
  }
  infoTitle.value = title
  infoContent.value = withCode(msg, code)
  showInfo.value = true
}

// ===== 登录态 =====
const auth = useAuth()
const { currentUser, isLoggedIn } = auth

// 当前访问用户页是否为登录用户本人
const viewingSelf = computed(() => {
  if (!currentUser.value || !user.value) return false
  return String(currentUser.value.id) === String(user.value.id)
})

// 进入个人资料修改页（/settings/profile），仅本人视角可见
const goEditProfile = () => {
  navigateTo('/settings/profile')
}

// ===== 获取用户资料 =====
async function fetchUserProfile(id: string): Promise<void> {
  if (!id) {
    failWithInfo(null, '用户 ID 缺失')
    return
  }
  loading.value = true
  try {
    const res = await api.getUserInfo(id)
    user.value = res.user ?? null
    isSelf.value = viewingSelf.value
    // 后端返回的关注关系：查看者是否关注了该用户
    // 注：getUserInfo 不返回关注状态，需单独调用 feeds 或关系接口；这里用 feed 接口回填
  } catch (err) {
    // 401 未登录：未登录访问 /user/:id 时后端要求登录（根据现有 /users/:uid/info 设计）
    if (err instanceof ApiRequestError && err.httpStatus === 401) {
      failWithInfo(err, '未登录无法访问用户主页', '未登录无法访问')
      return
    }
    failWithInfo(err, '访问用户主页失败')
  } finally {
    loading.value = false
  }
}

// ===== 获取用户统计数字 =====
async function fetchUserStats(id: string): Promise<void> {
  if (!id) return
  try {
    // 粉丝 / 关注：通过关系接口 counts（限制 offset=0, limit=1）
    const [followersRes, followingRes] = await Promise.all([
      api.getUserFollowers(id, 0, 1).catch(() => ({ count: 0 })),
      api.getUserFollowing(id, 0, 1).catch(() => ({ count: 0 })),
    ])
    stats.value.followers = Number(followersRes.count ?? 0)
    stats.value.following = Number(followingRes.count ?? 0)

    // 动态 / 文章 / 小说数量：通过用户内容流接口的 count 获取
    const [momentRes, articleRes, novelRes] = await Promise.all([
      api.getUserFeed(id, 'moment', 'time', 0, 1).catch(() => ({ count: 0 })),
      api.getUserFeed(id, 'article', 'time', 0, 1).catch(() => ({ count: 0 })),
      api.getUserFeed(id, 'novel', 'time', 0, 1).catch(() => ({ count: 0 })),
    ])
    stats.value.moments = Number(momentRes.count ?? 0)
    stats.value.articles = Number(articleRes.count ?? 0)
    stats.value.novels = Number(novelRes.count ?? 0)
    // 评论数暂无接口，置 0
    stats.value.comments = 0
    // 获赞总数：暂无单独接口，置 0（后续接入）
    stats.value.likes = 0
    // 好友数：互相关注，暂无接口，置 0（后续接入）
    stats.value.friends = 0
  } catch {
    // 统计失败不阻断页面主体展示
  }
}

// ===== 内容列表 =====
// 使用 /feeds/user/:uid（后端 AllowSelf，支持本人查看），返回完整 feed 条目（含正文/作者/互动计数），
// 无需再逐条拉取动态详情。
async function loadUserFeed(reset = false): Promise<void> {
  if (!rawUserId || feedLoading.value) return
  if (!reset && !feedHasMore.value) return

  feedLoading.value = true
  if (reset) {
    feedOffset.value = 0
    feedItems.value = []
    feedHasMore.value = true
  }

  try {
    const content = activeTab.value === 'novel' ? 'novel' : activeTab.value === 'article' ? 'article' : 'moment'
    const res = await api.getUserFeed(rawUserId, content, 'time', feedOffset.value, feedLimit)
    const items = res.items ?? []
    const total = Number(res.count ?? 0)

    feedItems.value.push(...items)

    feedOffset.value += items.length
    feedHasMore.value = items.length >= feedLimit && feedItems.value.length < total
  } catch (err) {
    failWithInfo(err, '访问动态失败', '访问动态失败')
  } finally {
    feedLoading.value = false
  }
}

// 标签切换时重置列表
watch(activeTab, () => {
  loadUserFeed(true)
})

// ===== 格式化时间 =====
// 发布时间原样传给卡片组件，展示时统一人性化格式化（见 utils/time.ts）

// feed 条目 → 动态卡片数据（仅动态类型）
interface MomentData {
  id: string
  content: string
  images?: string[]
  author: {
    id: string
    name: string
    avatar?: string
    verified?: boolean
  }
  publishTime: string
  location?: string
  stats: {
    likes: number
    comments: number
    shares: number
  }
  isLiked?: boolean
}

const momentList = computed<MomentData[]>(() => {
  return feedItems.value
    .filter((item) => item.type === 'moment')
    .map((item) => {
      const author = item.author
      return {
        id: String(item.id ?? ''),
        content: item.content ?? '',
        images: item.images ?? [],
        author: {
          id: String(author?.id ?? item.user_id ?? ''),
          name: author?.display_name || author?.displayName || author?.nickname || '用户',
          avatar: author?.avatar ?? undefined,
          verified: false,
        },
        publishTime: item.created_at ?? '',
        stats: {
          likes: item.stats?.likes ?? 0,
          comments: item.stats?.comments ?? 0,
          shares: item.stats?.shares ?? 0,
        },
        isLiked: item.is_liked ?? false,
      }
    })
})

// 图片临时链接解析：单条 feed 进入视图时再换取，避免一次性大量请求
const resolvedImages = ref<Record<string, string[]>>({})
async function resolveMomentImages(moment: MomentData): Promise<void> {
  if (!moment.images || moment.images.length === 0) return
  if (resolvedImages.value[moment.id]) {
    moment.images = resolvedImages.value[moment.id]
    return
  }
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
  resolvedImages.value[moment.id] = urls
  moment.images = urls
}

// 对每条可见动态延迟解析图片（性能：避免首屏一次性全部请求）
watch(momentList, (list) => {
  for (const m of list) {
    if (!resolvedImages.value[m.id] && m.images && m.images.length > 0) {
      resolveMomentImages(m)
    }
  }
}, { immediate: true })

// ===== 关注 / 取关 =====
async function handleFollowUser(): Promise<void> {
  if (!user.value || viewingSelf.value) return
  if (!isLoggedIn.value) {
    showLoginModal.value = true
    return
  }
  const targetId = String(user.value.id)
  try {
    if (isFollowing.value) {
      await api.unfollowUser(targetId)
      isFollowing.value = false
      stats.value.followers = Math.max(0, stats.value.followers - 1)
    } else {
      await api.followUser(targetId)
      isFollowing.value = true
      stats.value.followers++
    }
  } catch (err) {
    notifyError(err, isFollowing.value ? '取消关注失败' : '关注失败')
  }
}

// ===== 动态事件 =====
const likePending = new Set<string>()

const handleMomentLike = async (id: string) => {
  if (likePending.has(id)) return
  likePending.add(id)
  try {
    await api.likeMoment(id)
    const m = feedItems.value.find((x) => String(x.id) === id)
    if (m && !m.is_liked) {
      m.stats = { ...(m.stats ?? {}), likes: (m.stats?.likes ?? 0) + 1 }
      m.is_liked = true
    }
  } catch (err) {
    notifyError(err, '点赞失败')
  } finally {
    likePending.delete(id)
  }
}

const handleMomentUnlike = async (id: string) => {
  if (likePending.has(id)) return
  likePending.add(id)
  try {
    await api.unlikeMoment(id)
    const m = feedItems.value.find((x) => String(x.id) === id)
    if (m && m.is_liked) {
      m.stats = { ...(m.stats ?? {}), likes: Math.max(0, (m.stats?.likes ?? 0) - 1) }
      m.is_liked = false
    }
  } catch (err) {
    notifyError(err, '取消点赞失败')
  } finally {
    likePending.delete(id)
  }
}

const handleMomentComment = (id: string) => {
  navigateTo(`/moment/${encodeURIComponent(id)}`)
}

const handleMomentShare = (id: string) => {
  // TODO: 打开分享面板/复制链接
  console.log('share', id)
}

const handleMomentClick = (id: string) => {
  navigateTo(`/moment/${encodeURIComponent(id)}`)
}

const handleUserClick = (userId: string) => {
  if (String(userId) === String(currentUser.value?.id)) {
    navigateTo('/user/my')
  } else {
    navigateTo(`/user/${encodeURIComponent(userId)}`)
  }
}

// ===== 滚动加载更多 =====
function handleScroll(e: Event): void {
  const target = e.target as HTMLElement
  const nearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 200
  if (nearBottom && !feedLoading.value && feedHasMore.value) {
    loadUserFeed()
  }
}

// ===== 初始化 =====
// 在线状态定时刷新句柄（页面卸载时清理）
let presenceTimer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  await auth.restoreSession()
  await fetchUserProfile(rawUserId)
  if (user.value) {
    await fetchUserStats(rawUserId)
    await loadUserFeed(true)
    // 回填当前查看者与目标用户的关注关系
    if (isLoggedIn.value && !viewingSelf.value) {
      try {
        const followRes = await api.getUserFollowing(String(currentUser.value!.id), 0, 100)
        isFollowing.value = (followRes.users ?? []).some((u) => String(u.id) === rawUserId)
      } catch {
        isFollowing.value = false
      }
    }
  }
  // 在线状态：进入页面拉取一次，之后每 60 秒刷新（心跳判定的在线状态是动态变化的）
  void fetchPresence([rawUserId])
  presenceTimer = setInterval(() => {
    void fetchPresence([viewingUserId.value], { force: true })
  }, 60 * 1000)
})

onBeforeUnmount(() => {
  if (presenceTimer) {
    clearInterval(presenceTimer)
    presenceTimer = null
  }
})

// 路由变化时刷新（例如从 /user/1 到 /user/2）
watch(() => route.params.id, async (newId) => {
  const id = String(newId || '')
  if (!id) return
  viewingUserId.value = id
  void fetchPresence([id], { force: true })
  await fetchUserProfile(id)
  if (user.value) {
    await fetchUserStats(id)
    await loadUserFeed(true)
  }
})

// ===== 布局/登录/搜索/账号切换状态（与首页一致） =====
const showLoginModal = ref(false)
const showSearchModal = ref(false)
const showSwitchAccountModal = ref(false)
const switchAccountChoices = ref<MultipleAccountChoice[]>([])
const loginModalRef = ref<InstanceType<typeof LoginModal> | null>(null)

const serverMenu = ref<ServerMenuPayload | null>({
  items: [
    { id: 'account-settings', label: '账号设置', icon: 'fa-user-gear', action: 'route', route: '/settings/account' },
    { id: 'edit-profile', label: '编辑资料', icon: 'fa-pen', action: 'route', route: '/settings/profile' },
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

// ===== 资料展示文案 =====
const displayName = computed(() => user.value?.display_name || user.value?.displayName || user.value?.nickname || '用户')
const displayHandle = computed(() => {
  const h = user.value?.handle || user.value?.username
  if (!h) return ''
  return h.startsWith('@') ? h : `@${h}`
})
const displayBio = computed(() => user.value?.bio || '这个人很懒，什么都没有写~')
const registerDate = computed(() => {
  const iso = user.value?.created_at
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}/${m}/${d}`
})
// 在线状态（基于 SSE 连接心跳判定，见 usePresence）：
// 心跳正常 → 「在线」；离线但有活跃记录 → 「x前在线」；无活跃记录 → 「离线」
const { fetchPresence, presenceOf } = usePresence()
const presenceState = computed(() => presenceOf(viewingUserId.value))
const isUserOnline = computed(() => presenceState.value?.online ?? false)
const onlineText = computed(() => {
  const p = presenceState.value
  if (p?.online) return '在线'
  if (!p?.lastSeen) return '离线'
  const rel = formatRelativeTime(p.lastSeen)
  return rel ? `${rel}在线` : '离线'
})

// 账号状态与惩罚提示
const accountBanned = computed(() => false) // TODO: 后端用户资料需返回 status
const accountClosed = computed(() => false)
const isSelfViewing = computed(() => viewingSelf.value)

const punishmentText = computed(() => {
  // TODO: 后端 /users/:uid/info 已返回 punishment_mask，按权限位生成文案
  return ''
})

const banBannerText = computed(() => {
  // 本人视角下将"此账号"替换为"您的"
  const subject = isSelfViewing.value ? '您的' : '此账号'
  if (accountBanned.value) {
    return `由于严重违规，该用户被永久封禁，您无法查看TA的个人信息，也无法进行互动。`
  }
  if (punishmentText.value) {
    return `由于违反相关规范，${subject}部分权限已被禁用。`
  }
  return ''
})

// 顶部 banner 颜色
const bannerClass = computed(() => {
  if (accountBanned.value) return 'bg-red-50 text-red-600 border-red-100'
  if (punishmentText.value) return 'bg-yellow-50 text-yellow-700 border-yellow-100'
  return ''
})

function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toString()
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
      <!-- 顶部标题栏（与动态详情页一致） -->
      <header class="h-14 bg-white border-b border-gray-200 flex items-center justify-center px-4 sticky top-0 z-10">
        <button
          class="absolute left-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
          @click="leavePage"
        >
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        <h1 class="text-base font-medium text-gray-900">用户主页</h1>
        <button
          class="absolute right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
          @click="handleSearch"
        >
          <i class="fa-solid fa-magnifying-glass"></i>
        </button>
      </header>

      <div class="max-w-3xl mx-auto p-4 space-y-4" @scroll="handleScroll">
        <!-- 加载中 -->
        <div v-if="loading" class="glass-card rounded-2xl p-10 flex flex-col items-center justify-center gap-2 text-gray-400">
          <i class="fa-solid fa-circle-notch fa-spin text-2xl"></i>
          <span class="text-sm">加载中...</span>
        </div>

        <!-- 用户资料卡片 -->
        <div v-else-if="user" class="glass-card rounded-2xl p-5">
          <!-- 第一行：头像 + 信息 + 操作 -->
          <div class="flex items-start gap-4">
            <!-- 头像 -->
            <div class="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 bg-gray-900">
        <AvatarImg
          :avatar-uuid="user.avatar"
          class="w-full h-full"
        ></AvatarImg>
            </div>

            <!-- 用户信息 -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h1 class="text-xl font-semibold text-gray-900 truncate">
                    {{ displayName }}
                  </h1>
                  <p class="text-sm text-gray-500 mt-0.5">
                    {{ displayHandle }} · 加入于{{ registerDate }}
                  </p>
                </div>

                <!-- 右侧操作 -->
                <div class="flex items-center gap-2 flex-shrink-0">
                  <button
                    v-if="!viewingSelf"
                    class="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
                    :class="isFollowing
                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      : 'bg-lime-500 text-white hover:bg-lime-600'"
                    @click="handleFollowUser"
                  >
                    <i v-if="!isFollowing" class="fa-solid fa-plus mr-1"></i>
                    {{ isFollowing ? '已关注' : '关注' }}
                  </button>
                  <button
                    v-else
                    class="px-4 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                    @click="goEditProfile"
                  >
                    <i class="fa-solid fa-pen mr-1"></i>
                    编辑资料
                  </button>
                  <button class="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                    <i class="fa-solid fa-bars-staggered"></i>
                  </button>
                </div>
              </div>

              <!-- 个性签名 -->
              <p class="text-sm text-gray-700 mt-2 leading-relaxed">
                {{ displayBio }}
              </p>

              <!-- 在线状态（基于 SSE 连接心跳判定：心跳正常=在线） -->
              <p
                class="text-xs mt-1 flex items-center gap-1.5"
                :class="isUserOnline ? 'text-green-600' : 'text-gray-400'"
              >
                <span v-if="isUserOnline" class="w-2 h-2 rounded-full bg-green-500"></span>
                {{ onlineText }}
              </p>
            </div>
          </div>

          <!-- 状态提示条：功能禁用 / 账号封禁 -->
          <div
            v-if="banBannerText"
            class="mt-4 rounded-xl px-4 py-2.5 text-sm flex items-center gap-2 border"
            :class="bannerClass"
          >
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span>{{ banBannerText }}</span>
            <button class="ml-auto text-xs hover:underline" :class="accountBanned ? 'text-red-500' : 'text-lime-600'">
              点击查看详情
            </button>
          </div>

          <!-- 数据统计 -->
          <div class="mt-5">
            <h3 class="text-sm text-gray-500 mb-3">数据统计</h3>
            <div class="grid grid-cols-7 gap-2 text-center">
              <div>
                <div class="text-base font-semibold text-gray-900">{{ formatNumber(stats.followers) }}</div>
                <div class="text-xs text-gray-500">粉丝</div>
              </div>
              <div>
                <div class="text-base font-semibold text-gray-900">{{ formatNumber(stats.likes) }}</div>
                <div class="text-xs text-gray-500">获赞</div>
              </div>
              <div>
                <div class="text-base font-semibold text-gray-900">{{ formatNumber(stats.friends) }}</div>
                <div class="text-xs text-gray-500">好友</div>
              </div>
              <div class="border-r border-gray-200">
                <div class="text-base font-semibold text-gray-900">{{ formatNumber(stats.following) }}</div>
                <div class="text-xs text-gray-500">关注</div>
              </div>
              <div>
                <div class="text-base font-semibold text-gray-900">{{ formatNumber(stats.moments) }}</div>
                <div class="text-xs text-gray-500">动态</div>
              </div>
              <div>
                <div class="text-base font-semibold text-gray-900">{{ formatNumber(stats.articles) }}</div>
                <div class="text-xs text-gray-500">文章</div>
              </div>
              <div>
                <div class="text-base font-semibold text-gray-900">{{ formatNumber(stats.comments) }}</div>
                <div class="text-xs text-gray-500">评论</div>
              </div>
            </div>
          </div>

          <!-- 内容分类 tab -->
          <div class="mt-5 flex items-center gap-2 flex-wrap">
            <button
              v-for="tab in [
                { key: 'moment', label: `${stats.moments} 动态` },
                { key: 'article', label: `${stats.articles} 文章` },
                { key: 'novel', label: `${stats.novels} 小说` },
                { key: 'comment', label: `${stats.comments} 评论` },
              ]"
              :key="tab.key"
              class="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              :class="activeTab === tab.key
                ? 'bg-lime-100 text-lime-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              @click="activeTab = tab.key as any"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>

        <!-- 动态列表 -->
        <template v-if="user && activeTab === 'moment'">
          <Moments
            v-for="moment in momentList"
            :key="moment.id"
            :moment="moment"
            @like="handleMomentLike"
            @unlike="handleMomentUnlike"
            @comment="handleMomentComment"
            @share="handleMomentShare"
            @click="handleMomentClick"
            @user-click="handleUserClick"
          />

          <!-- 加载更多 -->
          <div v-if="feedLoading" class="glass-card rounded-2xl p-6 flex items-center justify-center text-gray-400 text-sm">
            <i class="fa-solid fa-circle-notch fa-spin mr-2"></i>
            加载中...
          </div>

          <!-- 无更多 -->
          <div v-else-if="!feedHasMore && momentList.length > 0" class="text-center text-sm text-gray-400 py-4">
            没有更多了
          </div>
        </template>

        <!-- 文章/小说/评论占位 -->
        <div v-else-if="user" class="glass-card rounded-2xl p-10 text-center text-gray-400">
          <i class="fa-regular fa-folder-open text-5xl text-gray-300 mb-3"></i>
          <p>该分类内容暂未展示</p>
        </div>
      </div>
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

    <!-- 访问失败提示 -->
    <InfoModal
      v-model:visible="showInfo"
      :title="infoTitle"
      :content="infoContent"
      confirm-text="好的"
      @confirm="handleInfoConfirm"
    />
  </div>
</template>
