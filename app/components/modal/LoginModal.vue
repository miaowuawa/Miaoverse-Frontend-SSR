<script setup lang="ts">
import { ref, watch } from 'vue'
import Modal from './Modal.vue'
import AccountSelectorModal from './AccountSelectorModal.vue'
import type { MultipleAccountChoice } from '~/types/user'
import { api } from '~/utils/api'
import { notifyError, notifySuccess } from '~/utils/notify'

const props = defineProps<{
  visible: boolean
  currentUser?: {
    id: string
    displayName: string
    handle: string
    avatar?: string | null
    token?: string
  } | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'login', data: { phone: string; region: number; uuid: string; code: number }): void
  (e: 'login-multiple-choices', data: { phone: string; choices: MultipleAccountChoice[] }): void
  (e: 'select-account', choice: MultipleAccountChoice): void
  (e: 'qq-login'): void
}>()

const phone = ref('')
const code = ref('')
const countdown = ref(0)
const isLoading = ref(false)
const isSending = ref(false)
const codeUUID = ref('')
const showAccountSelector = ref(false)
const multipleChoices = ref<MultipleAccountChoice[]>([])

const handleClose = () => {
  emit('update:visible', false)
  phone.value = ''
  code.value = ''
  codeUUID.value = ''
  isLoading.value = false
  showAccountSelector.value = false
  multipleChoices.value = []
}

const handleSelectorClose = () => {
  showAccountSelector.value = false
}

// 父组件直接关闭弹窗（如登录成功）时，重置内部状态
watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      phone.value = ''
      code.value = ''
      codeUUID.value = ''
      isLoading.value = false
      showAccountSelector.value = false
      multipleChoices.value = []
    }
  }
)

const handleGetCode = async () => {
  if (!phone.value || countdown.value > 0 || isSending.value) return

  isSending.value = true
  try {
    const res = await api.sendSmsCode(phone.value)
    codeUUID.value = res.code_uuid
    notifySuccess(res.msg || '验证码已发送')
    // 开始倒计时
    countdown.value = 60
    const timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(timer)
      }
    }, 1000)
  } catch (err) {
    notifyError(err, '验证码发送失败，请稍后重试')
  } finally {
    isSending.value = false
  }
}

const handleLogin = () => {
  if (!phone.value || !code.value || !codeUUID.value || isLoading.value) return

  isLoading.value = true
  emit('login', {
    phone: phone.value,
    region: 86,
    uuid: codeUUID.value,
    code: Number(code.value),
  })
}

// 登录流程结束（成功或失败）时由父组件调用，用于关闭 loading 与弹出错误通知
function finishLogin(err?: unknown) {
  isLoading.value = false
  if (err) {
    notifyError(err, '登录失败，请稍后重试')
  }
}

const handleQQLogin = () => {
  emit('qq-login')
}

// 暴露给父组件：当登录接口返回 300 multiple choices 时调用
function openAccountSelector(choices: MultipleAccountChoice[]) {
  multipleChoices.value = choices
  showAccountSelector.value = true
}

defineExpose({ openAccountSelector, finishLogin })
</script>

<template>
  <Modal
    :visible="visible"
    width="max-w-2xl"
    position="center"
    card-class="modal-glass"
    @close="handleClose"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="flex">
      <!-- 左侧：二维码区域 -->
      <div class="login-qr-glass w-64 p-6 flex flex-col items-center justify-center border-r border-white/40">
        <!-- 二维码占位 -->
        <div class="w-40 h-40 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4">
          <div class="text-center">
            <i class="fa-solid fa-qrcode text-6xl text-gray-800"></i>
          </div>
        </div>
        <p class="text-sm text-gray-600 text-center">
          使用喵星手机版/微信<br>扫码快捷登录
        </p>
      </div>

      <!-- 右侧：手机号登录 -->
      <div class="flex-1 p-8">
        <h2 class="text-xl font-medium text-gray-800 text-center mb-6">手机号登录</h2>

        <!-- 手机号输入 -->
        <div class="mb-4">
          <div class="flex items-center bg-gray-50 rounded-xl overflow-hidden border border-gray-200 focus-within:border-lime-500 focus-within:ring-2 focus-within:ring-lime-100 transition-all">
            <div class="pl-4 pr-2 text-gray-400">
              <i class="fa-solid fa-phone"></i>
            </div>
            <input
              v-model="phone"
              type="tel"
              placeholder="手机号"
              class="flex-1 bg-transparent py-3 pr-4 outline-none text-gray-700 placeholder-gray-400"
              maxlength="11"
            >
            <button
              class="mr-2 px-4 py-2.5 bg-lime-500 hover:bg-lime-600 text-white text-sm rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap"
              :disabled="countdown > 0 || !phone || isSending"
              @click="handleGetCode"
            >
              <i v-if="isSending" class="fa-solid fa-circle-notch fa-spin mr-1"></i>
              {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
            </button>
          </div>
        </div>

        <!-- 验证码输入 -->
        <div class="mb-4">
          <div class="flex items-center bg-gray-50 rounded-xl overflow-hidden border border-gray-200 focus-within:border-lime-500 focus-within:ring-2 focus-within:ring-lime-100 transition-all">
            <div class="pl-4 pr-2 text-gray-400">
              <i class="fa-solid fa-lock"></i>
            </div>
            <input
              v-model="code"
              type="text"
              placeholder="验证码"
              class="flex-1 bg-transparent py-3 pr-4 outline-none text-gray-700 placeholder-gray-400"
              maxlength="6"
            >
          </div>
        </div>

        <!-- 提示文字 -->
        <p class="text-xs text-gray-400 mb-6 text-center">
          *新用户验证手机号登陆后自动注册
        </p>

        <!-- 登录按钮 -->
        <button
          class="w-full bg-lime-500 hover:bg-lime-600 text-white font-medium py-3 rounded-xl transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          :disabled="!phone || !code || !codeUUID || isLoading"
          @click="handleLogin"
        >
          <i v-if="isLoading" class="fa-solid fa-circle-notch fa-spin"></i>
          <span>登录</span>
        </button>

        <!-- 分隔线 -->
        <div class="flex items-center gap-4 my-6">
          <div class="flex-1 h-px bg-gray-200"></div>
          <span class="text-sm text-gray-400">或者使用</span>
          <div class="flex-1 h-px bg-gray-200"></div>
        </div>

        <!-- QQ 登录 -->
        <button
          class="w-full flex items-center justify-center gap-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl transition-colors"
          @click="handleQQLogin"
        >
          <i class="fa-brands fa-qq text-xl text-blue-500"></i>
          <span>QQ 登录</span>
        </button>
      </div>
    </div>

    <!-- 多账号选择弹窗 -->
    <AccountSelectorModal
      v-model:visible="showAccountSelector"
      :phone="phone"
      :choices="multipleChoices"
      :current-user="currentUser ?? null"
      @confirm="emit('select-account', $event)"
      @close="handleSelectorClose"
    />
  </Modal>
</template>

<style scoped>
/* 左侧扫码区：毛玻璃 —— 半透明白底 + 强背景模糊，让弹窗外页面色彩
   透进来形成可见的磨砂质感；二维码白底框保持纯白，不影响扫码 */
.login-qr-glass {
  position: relative;
  background-color: rgba(255, 255, 255, 0.2);
  /* 顶部一束白色高光模拟玻璃反光，不再使用灰色调 */
  background-image: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.35) 0%,
    rgba(255, 255, 255, 0) 40%
  );
  -webkit-backdrop-filter: blur(20px) saturate(170%);
  backdrop-filter: blur(20px) saturate(170%);
  box-shadow:
    1px 0 0 rgba(255, 255, 255, 0.55) inset,
    0 -1px 0 rgba(255, 255, 255, 0.25) inset;
}

/* 毛玻璃要透出色彩，弹窗底板需更透明（仅登录弹窗生效，类名唯一） */
:global(.modal-glass) {
  background-color: rgba(255, 255, 255, 0.52);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  backdrop-filter: blur(16px) saturate(180%);
}

/* 低性能设备降级（由 <html>.low-perf 全局生效时，回退到接近不透明的浅灰） */
:global(.low-perf .login-qr-glass) {
  background-color: rgba(249, 250, 251, 0.95);
  background-image: none;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}

:global(.low-perf .modal-glass) {
  background-color: rgba(255, 255, 255, 0.92);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}
</style>
