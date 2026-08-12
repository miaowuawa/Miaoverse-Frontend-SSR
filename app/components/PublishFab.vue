<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { CurrentUser } from '~/types/user'

const props = defineProps<{
  currentUser?: CurrentUser | null
}>()

// 登录态兜底：布局/页面未传 currentUser prop 时回退到全局 auth 状态，
// 保证发布按钮在所有页面都能正确显示/隐藏。
const auth = useAuth()
const effectiveUser = computed(() => props.currentUser ?? auth.currentUser.value ?? null)
const isLoggedIn = computed(() => !!effectiveUser.value)

const emit = defineEmits<{
  (e: 'create-post'): void
  (e: 'create-article'): void
}>()

// 选择菜单显隐
const menuOpen = ref(false)

const handlePublishClick = () => {
  if (!isLoggedIn.value) return
  menuOpen.value = !menuOpen.value
}

const closeMenu = () => {
  menuOpen.value = false
}

const handleCreatePost = () => {
  menuOpen.value = false
  emit('create-post')
}

const handleCreateArticle = () => {
  menuOpen.value = false
  emit('create-article')
}

// 点击菜单外部关闭菜单
const menuRef = ref<HTMLElement | null>(null)
const buttonRef = ref<HTMLElement | null>(null)

const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as Node
  if (!menuRef.value?.contains(target) && !buttonRef.value?.contains(target)) {
    closeMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true)
})
</script>

<template>
  <div class="fixed right-4 bottom-20 z-40">
    <!-- 触发按钮 -->
    <button
      v-if="isLoggedIn"
      ref="buttonRef"
      class="publish-fab w-12 h-12 rounded-full bg-lime-500 hover:bg-lime-600 text-white shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
      :class="{ 'rotate-45': menuOpen }"
      title="发布"
      @click="handlePublishClick"
    >
      <i class="fa-solid fa-plus text-xl"></i>
    </button>

    <!-- 选择菜单 -->
    <Transition name="fab-menu">
      <div
        v-if="menuOpen"
        ref="menuRef"
        class="glass-card rounded-xl shadow-xl p-2 mt-3 w-36 origin-top-left"
      >
        <button
          class="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-lime-50/60 hover:text-lime-700 transition-colors text-left"
          @click="handleCreatePost"
        >
          <i class="fa-solid fa-comment-dots w-5 text-center"></i>
          <span>发动态</span>
        </button>
        <button
          class="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-lime-50/60 hover:text-lime-700 transition-colors text-left"
          @click="handleCreateArticle"
        >
          <i class="fa-solid fa-file-pen w-5 text-center"></i>
          <span>发文章</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.publish-fab {
  box-shadow:
    0 4px 14px rgba(132, 204, 22, 0.35),
    0 1px 2px rgba(17, 24, 39, 0.06);
}

.fab-menu-enter-active,
.fab-menu-leave-active {
  transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.fab-menu-enter-from,
.fab-menu-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.92);
}
</style>
