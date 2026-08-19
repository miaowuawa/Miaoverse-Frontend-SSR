<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { UserAccount, CurrentUser } from '~/types/user'
import AvatarImg from '~/components/AvatarImg.vue'

export interface MultipleAccountChoice {
  id: string
  displayName: string
  handle: string
  avatar?: string | null
  /** 账号活跃描述，例如 "3天前使用" */
  lastUsedAt?: string
  /** 注册时间，例如 "2022/01/22" */
  registeredAt?: string
}

const props = withDefaults(defineProps<{
  visible: boolean
  phone: string
  choices: MultipleAccountChoice[]
  currentUser: CurrentUser | null
  /** 场景：登录 or 切换账号 */
  mode?: 'login' | 'switch'
}>(), {
  mode: 'login',
})

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'close'): void
  (e: 'select', choice: MultipleAccountChoice): void
  (e: 'confirm', choice: MultipleAccountChoice): void
}>()

const selectedId = ref<string | null>(null)

const selectedChoice = computed<MultipleAccountChoice | null>(() => {
  if (!selectedId.value) return null
  return props.choices.find((c) => c.id === selectedId.value) || null
})

watch(
  () => [props.visible, props.choices] as const,
  ([visible, choices]) => {
    if (visible) {
      const currentChoice = choices.find((c) => props.currentUser && c.id === props.currentUser.id)
      selectedId.value = currentChoice?.id ?? (choices[0]?.id || null)
    }
  },
  { immediate: true }
)

function handleClose() {
  emit('update:visible', false)
  emit('close')
}

function handleSelect(choice: MultipleAccountChoice) {
  selectedId.value = choice.id
  emit('select', choice)
}

function handleConfirm() {
  if (!selectedChoice.value) return
  emit('confirm', selectedChoice.value)
}

function formatChoiceInfo(choice: MultipleAccountChoice): string {
  const parts: string[] = []
  if (choice.handle) parts.push(choice.handle)
  if (choice.registeredAt) parts.push(`注册于${choice.registeredAt}`)
  return parts.join(' - ')
}

const title = computed(() => (props.mode === 'switch' ? '切换账号' : '选择账号'))

const hintText = computed(() => {
  if (props.mode === 'switch') {
    return `当前登录了 ${props.choices.length} 个 Miaoverse 账号，切换到哪个呢？`
  }
  return `当前手机号绑定了多个 Miaoverse 账号，总共${props.choices.length}个。这次登录哪个呢？`
})

const confirmText = computed(() => (props.mode === 'switch' ? '切换' : '登入'))
</script>

<template>
  <Modal
    :visible="visible"
    width="max-w-lg"
    position="center"
    card-class="selector-modal-glass"
    @close="handleClose"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="p-6 sm:p-8">
      <!-- 标题 -->
      <h2 class="text-xl font-medium text-gray-800 text-center mb-3">
        {{ title }}
      </h2>

      <!-- 提示信息 -->
      <p class="text-sm text-gray-600 text-center mb-6 flex items-center justify-center gap-2">
        <i class="fa-solid fa-bell text-lime-600"></i>
        <span>{{ hintText }}</span>
      </p>

      <!-- 账号列表 -->
      <div class="space-y-3 mb-6">
        <button
          v-for="choice in choices"
          :key="choice.id"
          type="button"
          class="account-card group w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all"
          :class="{
            'account-card--selected': selectedId === choice.id,
            'account-card--unselected': selectedId !== choice.id,
          }"
          @click="handleSelect(choice)"
        >
          <!-- 头像 -->
          <div class="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
            <AvatarImg
              :avatar-uuid="choice.avatar"
              class="w-full h-full"
            />          </div>

          <!-- 账号信息 -->
          <div class="flex-1 min-w-0">
            <p class="text-base font-medium text-gray-800 truncate">
              {{ choice.displayName }}
              <span v-if="choice.lastUsedAt" class="font-normal text-gray-500">({{ choice.lastUsedAt }})</span>
            </p>
            <p class="text-sm text-gray-500 truncate">
              {{ formatChoiceInfo(choice) }}
            </p>
          </div>

          <!-- 勾选 -->
          <div
            class="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
            :class="selectedId === choice.id ? 'bg-lime-500 text-white' : 'bg-gray-200 text-gray-400'"
          >
            <i class="fa-solid fa-check text-sm"></i>
          </div>
        </button>
      </div>

      <!-- 反馈入口 -->
      <p class="text-sm text-center text-gray-600 mb-8">
        其中包含不属于自己的账号？
        <a href="javascript:void(0)" class="text-lime-600 hover:text-lime-700 hover:underline transition-colors">
          点击反馈
        </a>
      </p>

      <!-- 底部按钮 -->
      <div class="flex items-center justify-center gap-6">
        <button
          type="button"
          class="min-w-[140px] px-6 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium transition-colors"
          @click="handleClose"
        >
          取消登录
        </button>
        <button
          type="button"
          class="min-w-[140px] px-6 py-3 rounded-xl bg-lime-500 hover:bg-lime-600 text-white font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          :disabled="!selectedChoice"
          @click="handleConfirm"
        >
          <span>{{ confirmText }}</span>
        </button>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
/* 弹窗底板：比通用 glass-card 更通透，让背景色透入 */
:global(.selector-modal-glass) {
  background-color: rgba(255, 255, 255, 0.62);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  backdrop-filter: blur(18px) saturate(180%);
}

/* 账号选择卡片：液态玻璃质感 */
.account-card {
  position: relative;
  background-color: rgba(240, 240, 240, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.6) inset,
    0 -1px 0 rgba(255, 255, 255, 0.2) inset,
    0 2px 8px rgba(17, 24, 39, 0.04);
}

.account-card--unselected:hover {
  background-color: rgba(248, 250, 252, 0.72);
  border-color: rgba(255, 255, 255, 0.7);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.7) inset,
    0 -1px 0 rgba(255, 255, 255, 0.25) inset,
    0 4px 12px rgba(17, 24, 39, 0.06);
  transform: translateY(-1px);
}

.account-card--selected {
  background-color: rgba(255, 255, 255, 0.78);
  border-color: rgba(132, 204, 22, 0.45);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.75) inset,
    0 -1px 0 rgba(255, 255, 255, 0.25) inset,
    0 0 0 1px rgba(132, 204, 22, 0.25),
    0 6px 20px rgba(132, 204, 22, 0.12);
}

/* 低性能设备降级 */
:global(.low-perf .selector-modal-glass) {
  background-color: rgba(255, 255, 255, 0.95);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}

:global(.low-perf .account-card) {
  background-color: #f3f4f6;
  border-color: #e5e7eb;
  box-shadow: none;
}

:global(.low-perf .account-card--selected) {
  background-color: #f7fee7;
  border-color: #bef264;
}
</style>
