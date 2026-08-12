<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'nuxt/app'
import SidebarLeft from '~/components/container/SidebarLeft.vue'
import SidebarRight from '~/components/container/SidebarRight.vue'
import LoginModal from '~/components/modal/LoginModal.vue'
import AccountSelectorModal from '~/components/modal/AccountSelectorModal.vue'
import SearchModal from '~/components/modal/SearchModal.vue'
import MomentDetail, { type MomentDetailData } from '~/components/MomentDetail.vue'
import { api } from '~/utils/api'
import { notifyError, notifySuccess } from '~/utils/notify'
import type { MenuItem, ServerMenuPayload } from '~/types/menu'
import type { MultipleAccountChoice } from '~/types/user'

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
const commentsLoading = ref(false)

async function fetchMomentDetail(id: string): Promise<MomentDetailData> {
  // 安全：对拼接进 URL 的 ID 做 encodeURIComponent，防止路径注入
  try {
    return await api.getMomentDetail(id)
  } catch (err) {
    // 后端接口尚未实现时回退到 mock，避免页面无法预览
    // 仅将错误对象序列化为字符串，不暴露敏感响应数据
    console.warn('Backend moment detail API not ready, using mock data:', err instanceof Error ? err.message : String(err))
    return createMockMomentDetail(id)
  }
}

function createMockMomentDetail(id: string): MomentDetailData {
  return {
    id,
    content: '喵星是什么网站？有猫吗？',
    images: [],
    author: {
      id: 'u3',
      name: '要乐奈',
      handle: 'rana_mygo',
      avatar: '',
      verified: false,
    },
    publishTime: '2小时前',
    stats: {
      likes: 1680,
      comments: 2499,
      shares: 1000,
    },
    reactions: [
      { emoji: '😄', count: 3 },
    ],
    isLiked: false,
    isFollowing: false,
    isSelf: false,
  }
}

onMounted(async () => {
  if (!momentId) {
    notifyError(null, '动态 ID 缺失')
    return
  }
  loading.value = true
  commentsLoading.value = true
  try {
    moment.value = await fetchMomentDetail(momentId)
  } catch (err) {
    notifyError(err, '获取动态详情失败')
  } finally {
    loading.value = false
    commentsLoading.value = false
  }
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

const handleFollow = (userId: string) => {
  console.log('follow', userId)
  if (moment.value) {
    moment.value.isFollowing = true
  }
}

const handleUnfollow = (userId: string) => {
  console.log('unfollow', userId)
  if (moment.value) {
    moment.value.isFollowing = false
  }
}

const handleLike = async (id: string) => {
  if (!moment.value) return
  try {
    await api.likeMoment(id)
    moment.value.stats.likes++
    moment.value.isLiked = true
  } catch (err) {
    notifyError(err, '点赞失败')
  }
}

const handleUnlike = async (id: string) => {
  if (!moment.value) return
  try {
    await api.unlikeMoment(id)
    moment.value.stats.likes = Math.max(0, moment.value.stats.likes - 1)
    moment.value.isLiked = false
  } catch (err) {
    notifyError(err, '取消点赞失败')
  }
}

const handleComment = (id: string) => {
  // TODO: 聚焦评论输入框或打开评论弹窗
  console.log('comment', id)
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
  // TODO: 接入真实评论列表接口并传递排序参数
  console.log('sort comments by', sort)
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
      <div v-if="loading || !moment" class="min-h-screen flex items-center justify-center">
        <div class="flex items-center gap-2 text-gray-400">
          <i class="fa-solid fa-circle-notch fa-spin"></i>
          <span>加载中...</span>
        </div>
      </div>

      <MomentDetail
        v-else
        :moment="moment"
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
  </div>
</template>
