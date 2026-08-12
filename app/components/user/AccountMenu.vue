<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import type { CurrentUser } from '~/types/user'
import type { MenuItem, ParsedMenu, AccountWidgetMeta } from '~/types/menu'
import { parseServerMenu, normalizeAccounts } from '~/types/menu'

const props = defineProps<{
  visible: boolean
  currentUser: CurrentUser | null
  // 服务器返回的原始菜单数据；不传则使用默认四项
  serverMenu?: ParsedMenu | null
  // 触发源 DOM 元素，用于定位菜单（左下角向上展开）
  anchorEl?: HTMLElement | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'close'): void
  (e: 'logout'): void
  (e: 'switch-account'): void
  (e: 'menu-action', item: MenuItem): void
}>()

const menuRef = ref<HTMLElement | null>(null)

const menu = computed(() => {
  const parsed = parseServerMenu(props.serverMenu ?? null)
  return {
    ...parsed,
    accounts: normalizeAccounts(parsed.accounts, props.currentUser?.id),
  }
})

const widgetMeta = computed<AccountWidgetMeta>(() => {
  return (menu.value.widgetMeta ?? {}) as AccountWidgetMeta
})

const hasWidget = computed(() => menu.value.items.some((it) => it.type === 'widget' && it.widget === 'account'))

const filteredItems = computed(() => menu.value.items.filter((it) => it.type !== 'widget'))

function close() {
  emit('update:visible', false)
  emit('close')
}

function handleItemClick(item: MenuItem) {
  if (item.id === 'switch-account') {
    emit('switch-account')
    close()
    return
  }
  if (item.id === 'logout') {
    emit('logout')
    close()
    return
  }
  emit('menu-action', item)
  close()
}

function handleClickOutside(e: MouseEvent) {
  const target = e.target as Node
  if (!menuRef.value?.contains(target) && !props.anchorEl?.contains(target)) {
    close()
  }
}

watch(() => props.visible, (val) => {
  if (val) {
    document.addEventListener('click', handleClickOutside, true)
  } else {
    document.removeEventListener('click', handleClickOutside, true)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true)
})

const menuStyle = computed(() => {
  if (!props.anchorEl) return {}
  const rect = props.anchorEl.getBoundingClientRect()
  return {
    position: 'fixed' as const,
    left: `${rect.left + 12}px`,
    bottom: `${window.innerHeight - rect.top + 8}px`,
    width: `${rect.width - 24}px`,
    maxHeight: 'min(520px, calc(100vh - 120px))',
  }
})

const formatNumber = (n?: number) => {
  if (n === undefined || n === null) return '0'
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="menu-up">
      <div
        v-if="visible"
        ref="menuRef"
        class="glass-card rounded-xl shadow-2xl flex flex-col overflow-hidden z-[100] origin-bottom-left"
        :style="menuStyle"
      >
        <!-- 我的账户小组件 -->
        <div
          v-if="hasWidget"
          class="px-4 pt-4 pb-3 border-b border-white/40"
        >
          <p class="text-sm font-medium text-gray-700 mb-3">我的账户</p>
          <div class="flex items-center gap-4">
            <div class="text-center min-w-[44px]">
              <p class="text-base font-semibold text-gray-800">{{ formatNumber(widgetMeta.credits ?? 2000) }}</p>
              <p class="text-xs text-gray-500">积分</p>
            </div>
            <div class="text-center min-w-[44px]">
              <p class="text-base font-semibold text-gray-800">{{ formatNumber(widgetMeta.points ?? 2100) }}</p>
              <p class="text-xs text-gray-500">喵粮</p>
            </div>
            <div class="text-center min-w-[44px]">
              <p class="text-base font-semibold text-gray-800">{{ formatNumber(widgetMeta.coins ?? 1000) }}</p>
              <p class="text-xs text-gray-500">银子</p>
            </div>
          </div>
          <p class="text-xs text-gray-400 mt-2">具体数据请点击对应项目查看~</p>
        </div>

        <!-- 菜单项 -->
        <div class="py-1 overflow-y-auto">
          <template v-for="(item, idx) in filteredItems" :key="item.id">
            <div v-if="item.type === 'divider'" class="my-1 border-t border-gray-200/80"></div>
            <button
              v-else
              class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-lime-50/60 hover:text-lime-700 transition-colors text-left"
              :class="{ 'text-red-600 hover:bg-red-50/60 hover:text-red-700': item.id === 'logout' }"
              @click="handleItemClick(item)"
            >
              <i v-if="item.icon" :class="['fa-solid', item.icon, 'w-5 text-center text-gray-500', item.id === 'logout' ? 'text-red-400' : '']"></i>
              <span class="flex-1">{{ item.label }}</span>
            </button>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.menu-up-enter-active,
.menu-up-leave-active {
  transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.menu-up-enter-from,
.menu-up-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}
</style>
