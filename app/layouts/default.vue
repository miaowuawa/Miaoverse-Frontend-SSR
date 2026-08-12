<script setup lang="ts">
import PublishFab from '~/components/PublishFab.vue'
import PublishModal from '~/components/modal/PublishModal.vue'
import { notifySuccess } from '~/utils/notify'

// 页面加载时从后端恢复登录态（仅客户端执行，SSR 阶段跳过）
const auth = useAuth()
onMounted(() => {
  auth.restoreSession()
})

// 全局发布入口：所有页面右下角显示发布按钮（仅登录后可见）
const showPublishModal = ref(false)

// feed 刷新信号：发布成功后 +1，首页时间线监听到后重新拉取
const feedRefreshKey = useState<number>('feed:refreshKey', () => 0)

const handleCreatePost = () => {
  showPublishModal.value = true
}

const handleCreateArticle = () => {
  console.log('发文章')
}

// 发布成功后由 PublishModal 触发（发布/图片上传在弹窗内完成后才关闭）
const handlePublished = () => {
  notifySuccess('发布成功')
  feedRefreshKey.value++
}
</script>

<template>
  <div class="min-h-screen bg-bg-light">
    <slot />

    <!-- 登录后右下角发布入口（全局，所有页面生效） -->
    <PublishFab
      @create-post="handleCreatePost"
      @create-article="handleCreateArticle"
    />

    <!-- 发布动态弹窗（全局） -->
    <PublishModal
      v-model:visible="showPublishModal"
      @published="handlePublished"
    />
  </div>
</template>
