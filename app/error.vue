<script setup lang="ts">
import { computed } from 'vue'
import SidebarLeft from '~/components/container/SidebarLeft.vue'
import SidebarRight from '~/components/container/SidebarRight.vue'
import Game2048 from '~/components/Game2048.vue'

// 错误页面属性
const props = defineProps<{
  error: {
    statusCode: number
    statusMessage: string
    description?: string
  }
}>()

// 计算错误信息
const errorInfo = computed(() => {
  const code = props.error?.statusCode || 500
  
  // 4xx 客户端错误
  if (code >= 400 && code < 500) {
    const clientErrors: Record<number, { title: string; message: string; emoji: string }> = {
      400: { title: '错误请求', message: '服务器无法理解您的请求', emoji: '🤔' },
      401: { title: '未授权', message: '您需要登录才能访问此页面', emoji: '🔒' },
      403: { title: '禁止访问', message: '您没有权限访问此页面', emoji: '🚫' },
      404: { title: '页面未找到', message: '您访问的页面不存在或已被移除', emoji: '🔍' },
      405: { title: '方法不允许', message: '请求方法不被允许', emoji: '🚧' },
      408: { title: '请求超时', message: '服务器等待客户端发送请求的时间过长', emoji: '⏱️' },
      409: { title: '冲突', message: '请求与服务器当前状态冲突', emoji: '⚡' },
      410: { title: '已删除', message: '请求的资源已永久删除', emoji: '🗑️' },
      418: { title: '我是茶壶', message: '服务器拒绝冲泡咖啡，因为它是一个茶壶', emoji: '🫖' },
      429: { title: '请求过多', message: '您发送了太多请求，请稍后再试', emoji: '🐢' },
    }
    return clientErrors[code] || { title: '客户端错误', message: `发生了 ${code} 错误`, emoji: '⚠️' }
  }
  
  // 5xx 服务器错误
  if (code >= 500) {
    const serverErrors: Record<number, { title: string; message: string; emoji: string }> = {
      500: { title: '服务器内部错误', message: '服务器遇到了意外情况，无法完成请求', emoji: '💥' },
      502: { title: '错误网关', message: '服务器从上游服务器收到无效响应', emoji: '🌉' },
      503: { title: '服务不可用', message: '服务器暂时无法处理请求，请稍后再试', emoji: '🔧' },
      504: { title: '网关超时', message: '服务器未及时从上游服务器收到响应', emoji: '⏳' },
    }
    return serverErrors[code] || { title: '服务器错误', message: `发生了 ${code} 错误`, emoji: '🔥' }
  }
  
  return { title: '未知错误', message: '发生了未知错误', emoji: '❓' }
})

// 清除错误并返回首页
const handleClearError = () => {
  clearError({ redirect: '/' })
}

// 刷新页面
const handleRefresh = () => {
  window.location.reload()
}
</script>

<template>
  <div class="flex min-h-screen bg-bg-light">
    <!-- 左侧边栏 - 不激活任何项 -->
    <SidebarLeft :active-item="null" />

    <!-- 中间内容区 -->
    <div class="flex-1 ml-64 mr-80 flex flex-col">
      <!-- 错误信息区域 -->
      <div class="flex-1 flex items-center justify-center p-8">
        <div class="max-w-2xl w-full">
          <!-- 错误卡片 -->
          <div class="bg-white rounded-3xl shadow-lg overflow-hidden">
            <!-- 错误头部 -->
            <div class="bg-gradient-to-r from-gray-800 to-gray-900 p-8 text-center">
              <div class="text-6xl mb-4">{{ errorInfo.emoji }}</div>
              <h1 class="text-5xl font-bold text-white mb-2">
                {{ error?.statusCode || 500 }}
              </h1>
              <h2 class="text-2xl font-semibold text-lime-400">
                {{ errorInfo.title }}
              </h2>
            </div>

            <!-- 错误详情 -->
            <div class="p-8">
              <p class="text-gray-600 text-center text-lg mb-6">
                {{ errorInfo.message }}
              </p>
              
              <!-- 技术详情（如果有） -->
              <p v-if="error?.statusMessage && error.statusMessage !== errorInfo.title" 
                 class="text-sm text-gray-400 text-center mb-6">
                {{ error.statusMessage }}
              </p>

              <!-- 操作按钮 -->
              <div class="flex justify-center gap-4 mb-8">
                <button
                  class="px-6 py-3 bg-lime-500 text-white rounded-xl font-medium hover:bg-lime-600 transition-colors flex items-center gap-2"
                  @click="handleClearError"
                >
                  <i class="fa-solid fa-house"></i>
                  返回首页
                </button>
                <button
                  class="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors flex items-center gap-2"
                  @click="handleRefresh"
                >
                  <i class="fa-solid fa-rotate-right"></i>
                  刷新页面
                </button>
              </div>

              <!-- 分割线 -->
              <div class="relative my-8">
                <div class="absolute inset-0 flex items-center">
                  <div class="w-full border-t border-gray-200"></div>
                </div>
                <div class="relative flex justify-center">
                  <span class="bg-white px-4 text-sm text-gray-400">
                    等待期间玩个小游戏吧
                  </span>
                </div>
              </div>

              <!-- 2048 游戏 -->
              <div class="flex justify-center">
                <Game2048 :compact="true" />
              </div>
            </div>
          </div>

          <!-- 底部提示 -->
          <div class="mt-6 text-center">
            <p class="text-sm text-gray-400">
              如果问题持续存在，请
              <a href="#" class="text-lime-500 hover:underline">联系客服</a>
              或
              <a href="#" class="text-lime-500 hover:underline">提交反馈</a>
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧边栏 -->
    <SidebarRight />
  </div>
</template>
