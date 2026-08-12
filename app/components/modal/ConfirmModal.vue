<script setup lang="ts">
import { computed } from 'vue'
import Modal from './Modal.vue'

export interface ConfirmModalProps {
  visible: boolean
  /** 弹窗标题 */
  title: string
  /** 提示内容（支持多行） */
  content?: string
  /** 是否显示「不同意/取消」按钮；设为 false 时只保留一个确认按钮 */
  showCancel?: boolean
  /** 确认按钮文字 */
  confirmText?: string
  /** 取消按钮文字 */
  cancelText?: string
  /** 确认按钮类型：success 绿色 / danger 红色 */
  confirmType?: 'success' | 'danger'
  /** 取消按钮类型：danger 红色 / default 灰色 */
  cancelType?: 'danger' | 'default'
  /** 点击遮罩或按 Esc 是否允许关闭 */
  closeOnOverlay?: boolean
  /** 弹窗宽度 */
  width?: string
}

const props = withDefaults(defineProps<ConfirmModalProps>(), {
  content: '',
  showCancel: true,
  confirmText: '同意',
  cancelText: '不同意',
  confirmType: 'success',
  cancelType: 'danger',
  closeOnOverlay: true,
  width: 'max-w-lg',
})

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
  (e: 'close'): void
}>()

const confirmIcon = computed(() =>
  props.confirmType === 'danger' ? 'fa-xmark' : 'fa-check'
)
const cancelIcon = computed(() =>
  props.cancelType === 'danger' ? 'fa-xmark' : 'fa-xmark'
)

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  emit('cancel')
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
    card-class="confirm-modal-glass"
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

      <!-- 按钮区 -->
      <div
        class="flex w-full items-center justify-center gap-4"
        :class="{ 'flex-col sm:flex-row': showCancel }"
      >
        <button
          v-if="showCancel"
          type="button"
          class="confirm-btn"
          :class="cancelType === 'danger' ? 'btn-danger' : 'btn-default'"
          @click="handleCancel"
        >
          <i :class="['fa-solid', cancelIcon]"></i>
          <span>{{ cancelText }}</span>
        </button>

        <button
          type="button"
          class="confirm-btn"
          :class="confirmType === 'danger' ? 'btn-danger' : 'btn-success'"
          @click="handleConfirm"
        >
          <i :class="['fa-solid', confirmIcon]"></i>
          <span>{{ confirmText }}</span>
        </button>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
/* 弹窗底板：复用项目 glass-card，但稍微提亮透明度让按钮与文字更清晰 */
:global(.confirm-modal-glass) {
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
.confirm-btn {
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

.confirm-btn:active {
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

/* 默认灰色取消按钮 */
.btn-default {
  background-color: rgba(229, 231, 235, 0.65);
  color: #4b5563;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.55) inset,
    0 2px 8px rgba(17, 24, 39, 0.04);
}

.btn-default:hover {
  background-color: rgba(209, 213, 219, 0.8);
}

/* 低性能设备降级：去掉 backdrop-filter，背景更实，保持可读 */
:global(.low-perf .confirm-modal-glass) {
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

:global(.low-perf .btn-default) {
  background-color: #e5e7eb;
  box-shadow: none;
}
</style>
