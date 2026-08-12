import { computed, readonly } from 'vue'
import type { CurrentUser, MultipleAccountChoice } from '~/types/user'
import { normalizeServerUser, normalizeMultipleChoice } from '~/types/user'
import { api, ApiRequestError } from '~/utils/api'
import { notifyError, notifySuccess } from '~/utils/notify'

export interface LoginBySmsPayload {
  phone: string
  region: number
  uuid: string
  code: number
}

export interface LoginResult {
  type: 'success' | 'multiple_choices'
  user?: CurrentUser
  phone?: string
  choices?: MultipleAccountChoice[]
}

export function useAuth() {
  // 使用 useState 让登录态在所有页面/组件间共享（SSR 安全）。
  const currentUser = useState<CurrentUser | null>('auth:currentUser', () => null)
  const isLoggedIn = computed(() => !!currentUser.value)

  // 登录成功后统一写入登录态
  function applyUser(payload: CurrentUser): void {
    currentUser.value = payload
  }

  // 短信验证码登录：单账号直接登录；多账号返回候选列表
  async function loginBySMS(payload: LoginBySmsPayload): Promise<LoginResult> {
    const result = await api.loginBySms(payload)

    if (result.type === 'multiple_choices') {
      const choices = (result.users ?? [])
        .map((raw, idx) => normalizeMultipleChoice(raw, idx))
        .filter((c): c is MultipleAccountChoice => c !== null)
      return { type: 'multiple_choices', phone: payload.phone, choices }
    }

    const user = await fetchMe()
    if (!user) {
      throw new ApiRequestError(500, '登录成功但获取用户信息失败')
    }
    applyUser(user)
    notifySuccess(result.msg || '登录成功')
    return { type: 'success', user }
  }

  // 确认选择某个候选账号并完成登录
  async function confirmLoginByChoice(choice: MultipleAccountChoice): Promise<CurrentUser> {
    const uid = Number(choice.id)
    if (!Number.isInteger(uid) || uid <= 0) {
      throw new ApiRequestError(400, '账号参数异常')
    }
    const res = await api.chooseAccount(uid)
    const user = await fetchMe()
    if (!user) {
      throw new ApiRequestError(500, '登录成功但获取用户信息失败')
    }
    applyUser(user)
    notifySuccess(res.msg || '登录成功')
    return user
  }

  // 获取当前会话手机号绑定的可登录账号列表（含当前登录账号）
  async function fetchMyAccounts(): Promise<MultipleAccountChoice[]> {
    const res = await api.listAccounts()
    return (res.users ?? [])
      .map((raw, idx) => normalizeMultipleChoice(raw, idx))
      .filter((c): c is MultipleAccountChoice => c !== null)
  }

  // 切换到同一手机号下的另一个账号
  async function switchAccount(choice: MultipleAccountChoice): Promise<CurrentUser> {
    const uid = Number(choice.id)
    if (!Number.isInteger(uid) || uid <= 0) {
      throw new ApiRequestError(400, '账号参数异常')
    }
    const res = await api.switchAccount(uid)
    const user = await fetchMe()
    if (!user) {
      throw new ApiRequestError(500, '切换成功但获取用户信息失败')
    }
    applyUser(user)
    notifySuccess(res.msg || '切换成功')
    return user
  }

  // 从后端拉取当前登录用户；未登录返回 null
  async function fetchMe(): Promise<CurrentUser | null> {
    try {
      const res = await api.me()
      return normalizeServerUser(res.user)
    } catch (err) {
      if (err instanceof ApiRequestError && err.httpStatus === 401) {
        return null
      }
      throw err
    }
  }

  // 页面加载时恢复登录态（SSR 阶段不请求，避免服务端与客户端状态不一致）
  async function restoreSession(): Promise<void> {
    if (import.meta.server) return
    if (currentUser.value) return
    const user = await fetchMe()
    if (user) {
      applyUser(user)
    }
  }

  // 退出登录：先销毁服务端 session，再清空本地登录态
  async function logout(): Promise<void> {
    try {
      const res = await api.logout()
      notifySuccess(res.msg || '已退出登录')
    } catch (err) {
      // 退出失败仍清空本地登录态，避免用户被"卡"在已登录界面
      notifyError(err, '退出登录失败')
    } finally {
      currentUser.value = null
    }
  }

  return {
    currentUser: readonly(currentUser),
    isLoggedIn,
    loginBySMS,
    confirmLoginByChoice,
    fetchMe,
    fetchMyAccounts,
    switchAccount,
    restoreSession,
    logout,
  }
}
