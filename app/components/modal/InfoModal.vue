<script setup lang="ts">
import Modal from './Modal.vue'

export interface InfoModalProps {
  visible: boolean
  /** 弹窗标题 */
  title: string
  /** 提示内容（支持多行） */
  content?: string
  /** 确认按钮文字 */
  confirmText?: string
  /** 确认按钮类型 */
  confirmType?: 'success' | 'danger'
  /** 点击遮罩或按 Esc 是否允许关闭 */
  closeOnOverlay?: boolean
  /** 弹窗宽度 */
  width?: string
}

withDefaults(defineProps<InfoModalProps>(), {
  content: '',
  confirmText: '好的',
  confirmType: 'success',
  closeOnOverlay: true,
  width: 'max-w-lg',
})

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'confirm'): void
  (e: 'close'): void
}>()

const handleConfirm = () => {
  emit('confirm')
  emit('update:visible', false)
}

const handleClose = () => {
  emit('close')
  emit('update:visible', false)
}
</script>

<template>
  <Modal
    :visible="visible"
    :width="width"
    position="center"
    :show-close="false"
    :close-on-overlay="closeOnOverlay"
    card-class="info-modal-glass"
    @close="handleClose"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="flex flex-col items-center p-6 sm:p-8 text-center">
      <!-- 标题 -->
      <h2 class="text-xl font-medium text-gray-800 mb-3">
        {{ title }}
      </h2>

      <!-- 内容 -->
      <p
        v-if="content"
        class="text-sm text-gray-600 leading-relaxed mb-6 max-w-sm"
      >
        {{ content }}
      </p>

      <!-- 单个确认按钮 -->
      <button
        type="button"
        class="info-btn"
        :class="confirmType === 'danger' ? 'btn-danger' : 'btn-success'"
        @click="handleConfirm"
      >
        <i :class="['fa-solid', confirmType === 'danger' ? 'fa-xmark' : 'fa-check']"></i>
        <span>{{ confirmText }}</span>
      </button>
    </div>
  </Modal>
</template>

<style scoped>
/* 弹窗底板：毛玻璃 + 液态玻璃 */
:global(.info-modal-glass) {
  background-color: rgba(255, 255, 255, 0.78);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  backdrop-filter: blur(18px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.75) inset,
    0 -1px 0 rgba(255, 255, 255, 0.3) inset,
    0 8px 32px rgba(17, 24, 39, 0.08),
    0 2px 4px rgba(17, 24, 39, 0.04);
}

/* 统一按钮基底 */
.info-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-width: 140px;
  padding: 0.75rem 1.5rem;
  border-radius: 1rem;
  font-weight: 500;
  transition:
    background-color 0.2s ease,
    transform 0.15s ease,
    box-shadow 0.2s ease;
}

.info-btn:active {
  transform: scale(0.98);
}

/* 绿色成功按钮 */
.btn-success {
  background-color: rgba(132, 204, 22, 0.55);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.45);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.4) inset,
    0 4px 14px rgba(132, 204, 22, 0.22);
}

.btn-success:hover {
  background-color: rgba(132, 204, 22, 0.7);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.45) inset,
    0 6px 18px rgba(132, 204, 22, 0.28);
}

/* 红色危险按钮 */
.btn-danger {
  background-color: rgba(239, 68, 68, 0.55);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.45);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.4) inset,
    0 4px 14px rgba(239, 68, 68, 0.22);
}

.btn-danger:hover {
  background-color: rgba(239, 68, 68, 0.7);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.45) inset,
    0 6px 18px rgba(239, 68, 68, 0.28);
}

/* 低性能设备降级 */
:global(.low-perf .info-modal-glass) {
  background-color: rgba(255, 255, 255, 0.95);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}

:global(.low-perf .btn-success) {
  background-color: #a3e635;
  box-shadow: none;
}

:global(.low-perf .btn-danger) {
  background-color: #f87171;
  box-shadow: none;
}
</style>
