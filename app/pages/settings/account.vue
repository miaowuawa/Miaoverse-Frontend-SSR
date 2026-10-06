<script setup lang="ts">
// 账号设置页 /settings/account
//
// 入口：左下角账号菜单「账号设置」（types/menu.ts 中的 account-settings 项）
// 与「编辑资料」(/settings/profile) 的分工：
//   - 本页：账号凭据与安全 —— 绑定手机号（只读）、登录密码（手机验证码设置/修改）
//   - 编辑资料页：对外展示的资料 —— 头像、昵称、账号名、个性签名、性别
//
// 安全约定：
//   - 手机号只从服务端读取打码值（+86 138****8000），页面不持有完整号码，也不提供换绑入口；
//   - 修改密码的验证码由服务端发到当前会话绑定的手机号（POST /user/password/sms），
//     前端不传手机号，无法用于给任意号码发短信；
//   - 展示一律走 Vue 文本插值（{{ }}），禁止 v-html，避免 XSS；
//   - 新密码只存在于组件内存，提交后立即清空，不写入 localStorage。
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'nuxt/app'
import SidebarLeft from '~/components/container/SidebarLeft.vue'
import SidebarRight from '~/components/container/SidebarRight.vue'
import LoginModal from '~/components/modal/LoginModal.vue'
import AccountSelectorModal from '~/components/modal/AccountSelectorModal.vue'
import SearchModal from '~/components/modal/SearchModal.vue'
import InfoModal from '~/components/modal/InfoModal.vue'
import { api, ApiRequestError, type ServerUserPayload } from '~/utils/api'
import { notifyError, notifySuccess, withCode } from '~/utils/notify'
import type { MenuItem, ServerMenuPayload } from '~/types/menu'
import type { MultipleAccountChoice } from '~/types/user'

useHead({
  title: '账号设置 - Miaoverse',
})

const router = useRouter()
const auth = useAuth()
const { currentUser, isLoggedIn } = auth

// ===== 与服务端一致的密码规则（客户端只做即时提示，最终以服务端校验为准）=====
const MIN_PASSWORD_LEN = 8
const MAX_PASSWORD_LEN = 64
/** 验证码冷却秒数，与后端 consts.SMSSendCooldown（60s）保持一致 */
const CODE_COOLDOWN_SECONDS = 60

/** 按「字符数」计数，与服务端 bcrypt 前的长度校验口径一致 */
const charCount = (value: string): number => [...value].length

// ===== 页面状态 =====
const loading = ref(true)
const profile = ref<ServerUserPayload | null>(null)
const maskedPhone = ref('')
const hasPassword = ref(false)

const registerDate = computed(() => {
  const iso = profile.value?.created_at
  if (!iso) return '-'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}/${m}/${d}`
})

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

function goEditProfile(): void {
  navigateTo('/settings/profile')
}

// ===== 载入账号信息 =====
async function loadAccount(): Promise<void> {
  loading.value = true
  try {
    const res = await api.me()
    profile.value = res.user ?? null
    maskedPhone.value = res.phone ?? ''
  } catch (err) {
    if (err instanceof ApiRequestError && err.httpStatus === 401) {
      failWithInfo(err, '登录状态已失效，请重新登录', '未登录', true)
      return
    }
    failWithInfo(err, '获取账号信息失败，请稍后重试', '加载失败', true)
    return
  } finally {
    loading.value = false
  }

  // 密码状态失败不阻断其它信息展示
  try {
    const status = await api.getPasswordStatus()
    hasPassword.value = !!status.has_password
  } catch {
    hasPassword.value = false
  }
}

// ===== 修改密码（手机验证码）=====
const pwdForm = reactive({ code: '', password: '', confirm: '' })
const codeUUID = ref('')
const countdown = ref(0)
const sendingCode = ref(false)
const savingPassword = ref(false)
let countdownTimer: ReturnType<typeof setInterval> | null = null

function stopCountdown(): void {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

function startCountdown(): void {
  stopCountdown()
  countdown.value = CODE_COOLDOWN_SECONDS
  countdownTimer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      stopCountdown()
    }
  }, 1000)
}

async function sendPasswordCode(): Promise<void> {
  if (countdown.value > 0 || sendingCode.value) return
  sendingCode.value = true
  try {
    const res = await api.sendPasswordSmsCode()
    codeUUID.value = res.code_uuid
    notifySuccess(res.msg || '验证码已发送')
    startCountdown()
  } catch (err) {
    notifyError(err, '验证码发送失败，请稍后重试')
  } finally {
    sendingCode.value = false
  }
}

function validatePassword(): string | null {
  if (!codeUUID.value) {
    return '请先获取短信验证码'
  }
  if (!/^\d{4,8}$/.test(pwdForm.code)) {
    return '请输入收到的短信验证码'
  }
  const length = charCount(pwdForm.password)
  if (length < MIN_PASSWORD_LEN || length > MAX_PASSWORD_LEN) {
    return `密码需为 ${MIN_PASSWORD_LEN}-${MAX_PASSWORD_LEN} 个字符`
  }
  if (pwdForm.password !== pwdForm.password.trim()) {
    return '密码首尾不能包含空格'
  }
  const classes = [/[A-Za-z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(pwdForm.password)).length
  if (classes < 2) {
    return '密码需至少包含字母、数字、符号中的两类'
  }
  if (pwdForm.password !== pwdForm.confirm) {
    return '两次输入的密码不一致'
  }
  return null
}

async function savePassword(): Promise<void> {
  if (savingPassword.value) return

  const invalid = validatePassword()
  if (invalid) {
    notifyError(null, invalid)
    return
  }

  savingPassword.value = true
  try {
    const res = await api.updatePassword({
      uuid: codeUUID.value,
      code: Number(pwdForm.code),
      password: pwdForm.password,
    })
    hasPassword.value = !!res.has_password
    // 明文只在内存中短暂存在，提交后立即清空
    pwdForm.code = ''
    pwdForm.password = ''
    pwdForm.confirm = ''
    codeUUID.value = ''
    notifySuccess(res.msg || '密码设置成功')
  } catch (err) {
    // 验证码错误/过期/已用尽时让用户重新获取，避免在失效的 uuid 上反复尝试
    if (err instanceof ApiRequestError && err.httpStatus === 403 && codeUUID.value) {
      codeUUID.value = ''
      countdown.value = 0
      stopCountdown()
    }
    notifyError(err, '密码修改失败，请稍后重试')
  } finally {
    savingPassword.value = false
  }
}

// ===== 初始化 =====
onMounted(async () => {
  await auth.restoreSession()
  if (!isLoggedIn.value) {
    loading.value = false
    failWithInfo(null, '请先登录后再查看账号设置', '未登录', true)
    return
  }
  await loadAccount()
})

onUnmounted(() => {
  stopCountdown()
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
    await loadAccount()
  } catch (err) {
    loginModalRef.value?.finishLogin(err)
  }
}

const handleAccountSelected = async (choice: MultipleAccountChoice) => {
  try {
    await auth.confirmLoginByChoice(choice)
    showLoginModal.value = false
    await loadAccount()
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
    await loadAccount()
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
  if (item.route && item.route !== '/settings/account') {
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
      <!-- 顶部标题栏（与编辑资料页一致） -->
      <header class="h-14 bg-white border-b border-gray-200 flex items-center justify-center px-4 sticky top-0 z-10">
        <button
          class="absolute left-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
          @click="leavePage"
        >
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        <h1 class="text-base font-medium text-gray-900">账号设置</h1>
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
          <!-- 账号与安全 -->
          <section class="glass-card rounded-2xl p-5 space-y-5">
            <h2 class="text-sm font-medium text-gray-500">账号与安全</h2>

            <!-- 手机号：只读 -->
            <div class="flex items-center justify-between gap-4">
              <div class="min-w-0">
                <p class="text-sm text-gray-700">手机号</p>
                <p class="text-xs text-gray-400 mt-0.5">手机号当前不支持更改，如需换绑请联系管理员</p>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <span class="text-sm text-gray-600">{{ maskedPhone || '未绑定' }}</span>
                <span class="px-2 py-0.5 rounded-full bg-gray-100 text-[11px] text-gray-500">不可修改</span>
              </div>
            </div>

            <div class="border-t border-gray-100"></div>

            <!-- 密码 -->
            <div>
              <div class="flex items-center justify-between gap-4">
                <div class="min-w-0">
                  <p class="text-sm text-gray-700">登录密码</p>
                  <p class="text-xs text-gray-400 mt-0.5">
                    {{ hasPassword ? '已设置密码，可通过手机验证码修改' : '尚未设置密码，可通过手机验证码设置' }}
                  </p>
                </div>
                <span
                  class="px-2 py-0.5 rounded-full text-[11px] flex-shrink-0"
                  :class="hasPassword ? 'bg-lime-100 text-lime-700' : 'bg-gray-100 text-gray-500'"
                >
                  {{ hasPassword ? '已设置' : '未设置' }}
                </span>
              </div>

              <div class="mt-4 space-y-3">
                <!-- 验证码：点击后由服务端发到当前账号绑定的手机号 -->
                <div class="flex items-center bg-gray-50 rounded-xl overflow-hidden border border-gray-200 focus-within:border-lime-500 focus-within:ring-2 focus-within:ring-lime-100 transition-all">
                  <div class="pl-4 pr-2 text-gray-400"><i class="fa-solid fa-shield-halved"></i></div>
                  <input
                    v-model="pwdForm.code"
                    type="text"
                    inputmode="numeric"
                    placeholder="短信验证码"
                    maxlength="8"
                    autocomplete="one-time-code"
                    class="flex-1 bg-transparent py-3 pr-2 outline-none text-gray-700 placeholder-gray-400"
                  >
                  <button
                    class="mr-2 px-4 py-2.5 bg-lime-500 hover:bg-lime-600 text-white text-sm rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap"
                    :disabled="countdown > 0 || sendingCode"
                    @click="sendPasswordCode"
                  >
                    <i v-if="sendingCode" class="fa-solid fa-circle-notch fa-spin mr-1"></i>
                    {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
                  </button>
                </div>

                <!-- 新密码 -->
                <div class="flex items-center bg-gray-50 rounded-xl overflow-hidden border border-gray-200 focus-within:border-lime-500 focus-within:ring-2 focus-within:ring-lime-100 transition-all">
                  <div class="pl-4 pr-2 text-gray-400"><i class="fa-solid fa-lock"></i></div>
                  <input
                    v-model="pwdForm.password"
                    type="password"
                    placeholder="新密码"
                    :maxlength="MAX_PASSWORD_LEN"
                    autocomplete="new-password"
                    class="flex-1 bg-transparent py-3 pr-4 outline-none text-gray-700 placeholder-gray-400"
                  >
                </div>

                <!-- 确认新密码 -->
                <div class="flex items-center bg-gray-50 rounded-xl overflow-hidden border border-gray-200 focus-within:border-lime-500 focus-within:ring-2 focus-within:ring-lime-100 transition-all">
                  <div class="pl-4 pr-2 text-gray-400"><i class="fa-solid fa-lock"></i></div>
                  <input
                    v-model="pwdForm.confirm"
                    type="password"
                    placeholder="确认新密码"
                    :maxlength="MAX_PASSWORD_LEN"
                    autocomplete="new-password"
                    class="flex-1 bg-transparent py-3 pr-4 outline-none text-gray-700 placeholder-gray-400"
                  >
                </div>

                <p class="text-xs text-gray-400">
                  验证码将发送到上方绑定手机号。密码需 {{ MIN_PASSWORD_LEN }}-{{ MAX_PASSWORD_LEN }} 个字符，
                  且至少包含字母、数字、符号中的两类；修改成功后当前设备保持登录状态。
                </p>

                <button
                  type="button"
                  class="w-full bg-lime-500 hover:bg-lime-600 text-white font-medium py-3 rounded-xl transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  :disabled="savingPassword"
                  @click="savePassword"
                >
                  <i v-if="savingPassword" class="fa-solid fa-circle-notch fa-spin"></i>
                  <span>{{ hasPassword ? '修改密码' : '设置密码' }}</span>
                </button>
              </div>
            </div>
          </section>

          <!-- 账号信息（只读） -->
          <section class="glass-card rounded-2xl p-5 space-y-4">
            <h2 class="text-sm font-medium text-gray-500">账号信息</h2>
            <div class="flex items-center justify-between gap-4">
              <span class="text-sm text-gray-700">账号名</span>
              <span class="text-sm text-gray-600">{{ profile?.username || '-' }}</span>
            </div>
            <div class="border-t border-gray-100"></div>
            <div class="flex items-center justify-between gap-4">
              <span class="text-sm text-gray-700">用户 ID</span>
              <span class="text-sm text-gray-600">{{ profile?.id ?? '-' }}</span>
            </div>
            <div class="border-t border-gray-100"></div>
            <div class="flex items-center justify-between gap-4">
              <span class="text-sm text-gray-700">注册时间</span>
              <span class="text-sm text-gray-600">{{ registerDate }}</span>
            </div>
          </section>

          <!-- 前往编辑资料 -->
          <button
            type="button"
            class="glass-card rounded-2xl w-full p-4 flex items-center justify-between hover:bg-white/90 transition-colors text-left"
            @click="goEditProfile"
          >
            <div class="flex items-center gap-4">
              <i class="fa-solid fa-pen text-gray-600 w-5"></i>
              <div>
                <p class="font-medium text-gray-900">编辑资料</p>
                <p class="text-xs text-gray-400 mt-0.5">修改头像、昵称、账号名、个性签名与性别</p>
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
