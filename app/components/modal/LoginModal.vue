<script setup lang="ts">
import { ref } from 'vue'
import Modal from './Modal.vue'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'login', data: { phone: string; code: string }): void
  (e: 'qq-login'): void
}>()

const phone = ref('')
const code = ref('')
const countdown = ref(0)
const isLoading = ref(false)

const handleClose = () => {
  emit('update:visible', false)
  phone.value = ''
  code.value = ''
}

const handleGetCode = () => {
  if (!phone.value || countdown.value > 0) return

  // 开始倒计时
  countdown.value = 60
  const timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
    }
  }, 1000)

  // TODO: 调用获取验证码 API
  console.log('获取验证码:', phone.value)
}

const handleLogin = () => {
  if (!phone.value || !code.value) return

  isLoading.value = true
  emit('login', { phone: phone.value, code: code.value })

  // 模拟登录延迟
  setTimeout(() => {
    isLoading.value = false
  }, 1000)
}

const handleQQLogin = () => {
  emit('qq-login')
}
</script>

<template>
  <Modal
    :visible="visible"
    width="max-w-2xl"
    position="center"
    @close="handleClose"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="flex">
      <!-- 左侧：二维码区域 -->
      <div class="w-64 bg-gray-50 p-6 flex flex-col items-center justify-center border-r border-gray-100">
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
              :disabled="countdown > 0 || !phone"
              @click="handleGetCode"
            >
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
          :disabled="!phone || !code || isLoading"
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
  </Modal>
</template>
