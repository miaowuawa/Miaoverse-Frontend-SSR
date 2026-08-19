<script setup lang="ts">
// 头像展示组件：avatarUuid 为文件 UUID（user.avatar 字段），
// 挂载时通过后端临时链接接口换取可访问 URL；换取失败或为空时展示占位图标。
// 头像为公开可见文件，不受拉黑/屏蔽影响。
import { ref, watch, onMounted } from 'vue'
import { useAvatar } from '~/composables/useAvatar'

const props = defineProps<{
  avatarUuid?: string | null
  alt?: string
}>()

const { resolveAvatar } = useAvatar()
const src = ref<string | null>(null)
const failed = ref(false)

async function load() {
  if (!props.avatarUuid) {
    src.value = null
    failed.value = false
    return
  }
  const url = await resolveAvatar(props.avatarUuid)
  src.value = url
  failed.value = url === null
}

onMounted(load)
watch(() => props.avatarUuid, load)
</script>

<template>
  <img
    v-if="src"
    :src="src"
    :alt="alt ?? ''"
    class="w-full h-full object-cover"
  >
  <div v-else class="w-full h-full flex items-center justify-center">
    <i class="fa-solid fa-user text-white text-sm"></i>
  </div>
</template>
