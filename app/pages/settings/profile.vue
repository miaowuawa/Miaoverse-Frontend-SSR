<script setup lang="ts">
// 个人资料修改页 /settings/profile
//
// 入口：
//   - 左下角账号菜单「编辑资料」（types/menu.ts 中的 edit-profile 项）
//   - 个人主页 /user/my 与 /user/[id]（本人视角）的「编辑资料」按钮
//   - 账号设置页 (/settings/account) 底部的「编辑资料」入口
//
// 职责边界：本页只改「对外展示的资料」——头像、昵称、账号名、个性签名、性别。
// 绑定手机号与登录密码属于账号凭据，统一放在账号设置页 /settings/account。
//
// 安全约定：
//   - 所有写接口都是「本人」语义，用户身份由服务端从登录会话读取，前端不传、也无法传目标 uid；
//   - 展示与输入一律走 Vue 文本插值（{{ }}），禁止 v-html，避免 XSS；
//   - 头像先上传为公开图片（permission=0），再把文件 uuid 作为 avatar 字段随资料一起提交；
//     服务端会校验文件归属/图片类型/公开性，与 PUT /user/avatar 使用同一套规则。
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'nuxt/app'
import SidebarLeft from '~/components/container/SidebarLeft.vue'
import SidebarRight from '~/components/container/SidebarRight.vue'
import LoginModal from '~/components/modal/LoginModal.vue'
import AccountSelectorModal from '~/components/modal/AccountSelectorModal.vue'
import SearchModal from '~/components/modal/SearchModal.vue'
import InfoModal from '~/components/modal/InfoModal.vue'
import AvatarImg from '~/components/AvatarImg.vue'
import { api, ApiRequestError, type ServerUserPayload } from '~/utils/api'
import { notifyError, notifySuccess, withCode } from '~/utils/notify'
import type { MenuItem, ServerMenuPayload } from '~/types/menu'
import type { MultipleAccountChoice } from '~/types/user'

useHead({
  title: '编辑资料 - Miaoverse',
})

const router = useRouter()
const auth = useAuth()
const { currentUser, isLoggedIn } = auth

// ===== 与服务端一致的校验规则（客户端只做即时提示，最终以服务端校验为准）=====
const MAX_USERNAME_LEN = 64
const MIN_USERNAME_LEN = 2
const MAX_NICKNAME_LEN = 64
const MAX_BIO_LEN = 255
/** 账号名：ASCII 字母/数字/下划线/中划线/点，且以字母或数字开头（后端 UserProfile.NormalizeUsername） */
const USERNAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/
/** 头像文件：与服务端图片安全校验一致，只接受安全栅格图片 */
const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
/** 头像大小上限，与后端 upload.max_file_size_bytes 默认值一致（超限由服务端兜底拒绝） */
const AVATAR_MAX_BYTES = 20 * 1024 * 1024

const GENDER_OPTIONS = [
  { value: 0, label: '不愿透露' },
  { value: 1, label: '男' },
  { value: 2, label: '女' },
  { value: 3, label: '非二元性别' },
] as const

/** 按「字符数」计数：昵称/签名上限按字符而非 UTF-16 单元计算，中文与 emoji 才不会被误判超长 */
const charCount = (value: string): number => [...value].length

// ===== 页面状态 =====
const loading = ref(true)
const savingProfile = ref(false)
const avatarUploading = ref(false)

const form = reactive({
  username: '',
  nickname: '',
  avatar: '' as string | null,
  bio: '',
  gender: 0,
})

// 服务端返回的原始快照：用于只提交发生变化的字段，避免误覆盖
const baseline = reactive({
  username: '',
  nickname: '',
  avatar: '' as string | null,
  bio: '',
  gender: 0,
})

const usernameLen = computed(() => charCount(form.username))
const nicknameLen = computed(() => charCount(form.nickname))
const bioLen = computed(() => charCount(form.bio))

/** 待提交的脏字段（PATCH 语义：未变化字段不提交） */
const dirtyPatch = computed<{
  username?: string
  nickname?: string
  avatar?: string
  bio?: string
  gender?: number
}>(() => {
  const patch: { username?: string; nickname?: string; avatar?: string; bio?: string; gender?: number } = {}
  if (form.username.trim() !== baseline.username) patch.username = form.username.trim()
  if (form.nickname.trim() !== baseline.nickname) patch.nickname = form.nickname.trim()
  // 头像：新上传的文件 UUID 与当前头像不同才提交
  if (form.avatar && form.avatar !== baseline.avatar) patch.avatar = form.avatar
  if (form.bio.trim() !== baseline.bio) patch.bio = form.bio.trim()
  if (form.gender !== baseline.gender) patch.gender = form.gender
  return patch
})
const isDirty = computed(() => Object.keys(dirtyPatch.value).length > 0)

// ===== 提示弹窗 =====
const showInfo = ref(false)
const infoTitle = ref('')
const infoContent = ref('')
const leaveAfterInfo = ref(false)

function failWithInfo(err: unknown, fallbackMsg: string, title: string, leave = false): void {
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
  leaveAfterInfo.value = leave
  showInfo.value = true
}

const handleInfoConfirm = () => {
  showInfo.value = false
  if (leaveAfterInfo.value) {
    leavePage()
  }
}

function leavePage(): void {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back()
  } else {
    router.replace('/user/my')
  }
}

// ===== 载入资料 =====
function applyProfile(user: ServerUserPayload): void {
  form.username = user.username ?? ''
  form.nickname = user.nickname ?? user.display_name ?? user.displayName ?? ''
  form.avatar = user.avatar ?? null
  form.bio = user.bio ?? ''
  form.gender = typeof user.gender === 'number' ? user.gender : 0

  baseline.username = form.username
  baseline.nickname = form.nickname
  baseline.avatar = form.avatar
  baseline.bio = form.bio
  baseline.gender = form.gender
}

async function loadProfile(): Promise<void> {
  loading.value = true
  try {
    const res = await api.me()
    applyProfile(res.user)
  } catch (err) {
    if (err instanceof ApiRequestError && err.httpStatus === 401) {
      failWithInfo(err, '登录状态已失效，请重新登录', '未登录', true)
      return
    }
    failWithInfo(err, '获取个人资料失败，请稍后重试', '加载失败', true)
    return
  } finally {
    loading.value = false
  }
}

/** 前往账号设置页（绑定手机号、登录密码） */
function goAccountSettings(): void {
  navigateTo('/settings/account')
}

// ===== 头像 =====
// 选择新头像后先上传文件（公开权限），拿到文件 UUID 只写入表单；
// 真正落库由「保存修改」通过 PATCH /api/v1/user/info 的 avatar 字段完成，
// 这样头像与其它资料是一次提交，点「重置」可以一起还原。
const avatarInput = ref<HTMLInputElement | null>(null)

function openAvatarPicker(): void {
  if (avatarUploading.value) return
  avatarInput.value?.click()
}

async function handleAvatarChange(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  // 立即清空 input，允许用户重新选择同一个文件
  input.value = ''
  if (!file || avatarUploading.value) return

  if (!AVATAR_MIME_TYPES.includes(file.type)) {
    notifyError(null, '头像仅支持 jpg/png/gif/webp 图片')
    return
  }
  if (file.size > AVATAR_MAX_BYTES) {
    notifyError(null, '头像文件过大（最大 20MB），请压缩后重试')
    return
  }

  avatarUploading.value = true
  try {
    // permission=0（公开）：头像必须公开文件，否则服务端会以「非公开」拒绝
    const uploaded = await api.uploadFile(file, 'image', 0)
    form.avatar = uploaded.uuid
    notifySuccess('头像已就绪，点击「保存修改」后生效')
  } catch (err) {
    notifyError(err, '头像上传失败，请稍后重试')
  } finally {
    avatarUploading.value = false
  }
}

// ===== 保存资料 =====
// 只校验本次要提交的字段：历史数据可能不符合当前规则（例如早期创建的非 ASCII 账号名），
// 若校验全部字段，用户会因为这些没被修改的字段而无法保存昵称等其它资料。
function validatePatch(patch: { username?: string; nickname?: string; bio?: string; gender?: number }): string | null {
  if (patch.username !== undefined) {
    const length = charCount(patch.username)
    if (length < MIN_USERNAME_LEN || length > MAX_USERNAME_LEN) {
      return `账号名需为 ${MIN_USERNAME_LEN}-${MAX_USERNAME_LEN} 个字符`
    }
    if (!USERNAME_PATTERN.test(patch.username)) {
      return '账号名只能包含字母、数字、下划线、中划线和点，且需以字母或数字开头'
    }
  }
  if (patch.nickname !== undefined) {
    const length = charCount(patch.nickname)
    if (length < 1 || length > MAX_NICKNAME_LEN) {
      return `昵称需为 1-${MAX_NICKNAME_LEN} 个字符`
    }
  }
  if (patch.bio !== undefined && charCount(patch.bio) > MAX_BIO_LEN) {
    return `个性签名最多 ${MAX_BIO_LEN} 个字符`
  }
  return null
}

async function saveProfile(): Promise<void> {
  if (savingProfile.value) return

  const patch = dirtyPatch.value
  if (Object.keys(patch).length === 0) {
    notifyError(null, '没有需要保存的修改')
    return
  }

  const invalid = validatePatch(patch)
  if (invalid) {
    notifyError(null, invalid)
    return
  }

  savingProfile.value = true
  try {
    const res = await api.updateProfile(patch)
    applyProfile(res.user)
    // 同步全局登录态，让左侧栏等位置立即显示新昵称/头像
    await auth.refreshUser()
    notifySuccess(res.msg || '资料已保存')
  } catch (err) {
    notifyError(err, '保存失败，请稍后重试')
  } finally {
    savingProfile.value = false
  }
}

function resetProfile(): void {
  form.username = baseline.username
  form.nickname = baseline.nickname
  form.avatar = baseline.avatar
  form.bio = baseline.bio
  form.gender = baseline.gender
}

// ===== 初始化 =====
onMounted(async () => {
  await auth.restoreSession()
  if (!isLoggedIn.value) {
    loading.value = false
    failWithInfo(null, '请先登录后再修改个人资料', '未登录', true)
    return
  }
  await loadProfile()
})

// ===== 左侧栏 / 登录 / 搜索 / 账号切换（与其他页面保持一致）=====
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
    await loadProfile()
  } catch (err) {
    loginModalRef.value?.finishLogin(err)
  }
}

const handleAccountSelected = async (choice: MultipleAccountChoice) => {
  try {
    await auth.confirmLoginByChoice(choice)
    showLoginModal.value = false
    await loadProfile()
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
    await loadProfile()
  } catch (err) {
    notifyError(err, '切换账号失败，请稍后重试')
  }
}

const handleLogout = async () => {
  await auth.logout()
  router.replace('/')
}

const handleSearch = () => {
  showSearchModal.value = true
}

const handleSearchSubmit = (keyword: string) => {
  console.log('Search:', keyword)
}

const handleSearchSelect = (item: unknown) => {
  console.log('Select:', item)
}

const handleMenuAction = (item: MenuItem) => {
  if (item.route && item.route !== '/settings/profile') {
    navigateTo(item.route)
  }
}

const handleSignIn = () => {
  console.log('签到')
}
</script>

<template>
  <div class="flex min-h-screen bg-bg-light">
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

    <main class="flex-1 ml-64" :class="{ 'mr-80': isLoggedIn }">
      <!-- 顶部标题栏（与我的主页一致） -->
      <header class="h-14 bg-white border-b border-gray-200 flex items-center justify-center px-4 sticky top-0 z-10">
        <button
          class="absolute left-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
          @click="leavePage"
        >
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        <h1 class="text-base font-medium text-gray-900">编辑资料</h1>
        <button
          class="absolute right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
          @click="handleSearch"
        >
          <i class="fa-solid fa-magnifying-glass"></i>
        </button>
      </header>

      <div class="max-w-3xl mx-auto p-4 space-y-4">
        <div
          v-if="loading"
          class="glass-card rounded-2xl p-10 flex flex-col items-center justify-center gap-2 text-gray-400"
        >
          <i class="fa-solid fa-circle-notch fa-spin text-2xl"></i>
          <span class="text-sm">加载中...</span>
        </div>

        <template v-else-if="isLoggedIn && !showInfo">
          <!-- 头像 -->
          <section class="glass-card rounded-2xl p-5">
            <h2 class="text-sm font-medium text-gray-500 mb-4">头像</h2>
            <div class="flex items-center gap-5">
              <div class="relative w-20 h-20 rounded-full overflow-hidden flex-shrink-0 bg-gray-900">
                <AvatarImg :avatar-uuid="form.avatar" class="w-full h-full" />
                <button
                  class="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 hover:opacity-100 transition-opacity"
                  :disabled="avatarUploading"
                  @click="openAvatarPicker"
                >
                  <i v-if="avatarUploading" class="fa-solid fa-circle-notch fa-spin"></i>
                  <i v-else class="fa-solid fa-camera"></i>
                </button>
              </div>
              <div class="flex-1 min-w-0">
                <button
                  class="px-4 py-2 rounded-xl text-sm font-medium bg-lime-500 hover:bg-lime-600 text-white transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  :disabled="avatarUploading"
                  @click="openAvatarPicker"
                >
                  <i v-if="avatarUploading" class="fa-solid fa-circle-notch fa-spin mr-1"></i>
                  {{ avatarUploading ? '上传中...' : '重新上传头像' }}
                </button>
                <p class="text-xs text-gray-400 mt-2">
                  支持 jpg/png/gif/webp，最大 20MB；上传后点击「保存修改」生效，头像对所有人生效。
                </p>
                <p v-if="form.avatar && form.avatar !== baseline.avatar" class="text-xs text-amber-600 mt-1">
                  <i class="fa-solid fa-circle-exclamation mr-1"></i>新头像待保存
                </p>
              </div>
            </div>
            <input
              ref="avatarInput"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              class="hidden"
              @change="handleAvatarChange"
            >
          </section>

          <!-- 基本资料 -->
          <section class="glass-card rounded-2xl p-5 space-y-4">
            <h2 class="text-sm font-medium text-gray-500">基本资料</h2>

            <!-- 昵称 -->
            <div>
              <label class="block text-sm text-gray-700 mb-1.5" for="profile-nickname">昵称</label>
              <div class="flex items-center bg-gray-50 rounded-xl overflow-hidden border border-gray-200 focus-within:border-lime-500 focus-within:ring-2 focus-within:ring-lime-100 transition-all">
                <div class="pl-4 pr-2 text-gray-400"><i class="fa-solid fa-signature"></i></div>
                <input
                  id="profile-nickname"
                  v-model="form.nickname"
                  type="text"
                  placeholder="昵称"
                  :maxlength="MAX_NICKNAME_LEN"
                  class="flex-1 bg-transparent py-3 pr-4 outline-none text-gray-700 placeholder-gray-400"
                >
              </div>
              <p class="text-xs text-gray-400 mt-1 flex justify-between">
                <span>全局唯一，其他人可以通过昵称搜到你</span>
                <span>{{ nicknameLen }}/{{ MAX_NICKNAME_LEN }}</span>
              </p>
            </div>

            <!-- 账号名 -->
            <div>
              <label class="block text-sm text-gray-700 mb-1.5" for="profile-username">账号名</label>
              <div class="flex items-center bg-gray-50 rounded-xl overflow-hidden border border-gray-200 focus-within:border-lime-500 focus-within:ring-2 focus-within:ring-lime-100 transition-all">
                <div class="pl-4 pr-2 text-gray-400"><i class="fa-solid fa-at"></i></div>
                <input
                  id="profile-username"
                  v-model="form.username"
                  type="text"
                  placeholder="账号名"
                  :maxlength="MAX_USERNAME_LEN"
                  autocomplete="off"
                  class="flex-1 bg-transparent py-3 pr-4 outline-none text-gray-700 placeholder-gray-400"
                >
              </div>
              <p class="text-xs text-gray-400 mt-1 flex justify-between">
                <span>字母、数字、下划线、中划线、点，需以字母或数字开头</span>
                <span>{{ usernameLen }}/{{ MAX_USERNAME_LEN }}</span>
              </p>
            </div>

            <!-- 个性签名 -->
            <div>
              <label class="block text-sm text-gray-700 mb-1.5" for="profile-bio">个性签名</label>
              <div class="bg-gray-50 rounded-xl overflow-hidden border border-gray-200 focus-within:border-lime-500 focus-within:ring-2 focus-within:ring-lime-100 transition-all">
                <textarea
                  id="profile-bio"
                  v-model="form.bio"
                  rows="3"
                  placeholder="这个人很懒，什么都没有写~"
                  :maxlength="MAX_BIO_LEN"
                  class="w-full bg-transparent p-4 outline-none text-gray-700 placeholder-gray-400 resize-none"
                ></textarea>
              </div>
              <p class="text-xs text-gray-400 mt-1 text-right">{{ bioLen }}/{{ MAX_BIO_LEN }}</p>
            </div>

            <!-- 性别 -->
            <div>
              <span class="block text-sm text-gray-700 mb-1.5">性别</span>
              <div class="flex flex-wrap items-center gap-2">
                <button
                  v-for="option in GENDER_OPTIONS"
                  :key="option.value"
                  type="button"
                  class="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                  :class="form.gender === option.value
                    ? 'bg-lime-100 text-lime-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
                  @click="form.gender = option.value"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>

            <!-- 保存 -->
            <div class="flex items-center justify-end gap-3 pt-1">
              <span v-if="isDirty" class="text-xs text-amber-600 mr-auto">
                <i class="fa-solid fa-circle-exclamation mr-1"></i>有未保存的修改
              </span>
              <button
                type="button"
                class="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                :disabled="!isDirty || savingProfile"
                @click="resetProfile"
              >
                重置
              </button>
              <button
                type="button"
                class="px-5 py-2 rounded-xl text-sm font-medium bg-lime-500 hover:bg-lime-600 text-white transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                :disabled="!isDirty || savingProfile"
                @click="saveProfile"
              >
                <i v-if="savingProfile" class="fa-solid fa-circle-notch fa-spin mr-1"></i>
                {{ savingProfile ? '保存中...' : '保存修改' }}
              </button>
            </div>
          </section>

          <!-- 账号与安全（手机号、密码）在独立的账号设置页维护 -->
          <button
            type="button"
            class="glass-card rounded-2xl w-full p-4 flex items-center justify-between hover:bg-white/90 transition-colors text-left"
            @click="goAccountSettings"
          >
            <div class="flex items-center gap-4">
              <i class="fa-solid fa-shield-halved text-gray-600 w-5"></i>
              <div>
                <p class="font-medium text-gray-900">账号与安全</p>
                <p class="text-xs text-gray-400 mt-0.5">绑定手机号（只读）与登录密码设置 / 修改</p>
              </div>
            </div>
            <i class="fa-solid fa-chevron-right text-gray-300"></i>
          </button>

        </template>
      </div>
    </main>

    <SidebarRight v-if="isLoggedIn" />

    <LoginModal
      ref="loginModalRef"
      v-model:visible="showLoginModal"
      :current-user="currentUser"
      @login="handleLoginSubmit"
      @select-account="handleAccountSelected"
    />

    <SearchModal
      v-model:visible="showSearchModal"
      @search="handleSearchSubmit"
      @select="handleSearchSelect"
    />

    <AccountSelectorModal
      v-model:visible="showSwitchAccountModal"
      mode="switch"
      :phone="currentUser?.handle ?? ''"
      :choices="switchAccountChoices"
      :current-user="currentUser"
      @confirm="handleSwitchAccountConfirm"
    />

    <InfoModal
      v-model:visible="showInfo"
      :title="infoTitle"
      :content="infoContent"
      confirm-text="好的"
      @confirm="handleInfoConfirm"
    />
  </div>
</template>
