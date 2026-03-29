<script setup lang="ts">
const props = withDefaults(defineProps<{
  visible: boolean
  width?: string
  position?: 'center' | 'top'
  showClose?: boolean
  closeOnOverlay?: boolean
}>(), {
  width: 'max-w-xl',
  position: 'center',
  showClose: true,
  closeOnOverlay: true,
})

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'close'): void
}>()

const handleClose = () => {
  emit('update:visible', false)
  emit('close')
}

const handleOverlayClick = () => {
  if (props.closeOnOverlay) {
    handleClose()
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    handleClose()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="visible"
        class="fixed inset-0 bg-black/30 backdrop-blur-md z-50 flex p-4"
        :class="position === 'center' ? 'items-center justify-center' : 'items-start justify-center pt-32'"
        @click.self="handleOverlayClick"
      >
        <Transition name="scale">
          <div
            v-if="visible"
            class="bg-white rounded-2xl shadow-2xl w-full overflow-hidden relative"
            :class="width"
            @keydown="handleKeydown"
            tabindex="-1"
          >
            <!-- 关闭按钮 -->
            <button
              v-if="showClose"
              class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors z-10"
              @click="handleClose"
            >
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>

            <!-- 内容插槽 -->
            <slot />
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.scale-enter-active,
.scale-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.scale-enter-from,
.scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
