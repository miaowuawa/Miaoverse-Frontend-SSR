<script setup lang="ts">
interface Props {
  user: {
    id: string
    name: string
    avatar?: string
    bio?: string
    verified?: boolean
  }
  isFollowing?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'follow', userId: string): void
  (e: 'unfollow', userId: string): void
  (e: 'click', userId: string): void
}>()

const handleFollow = () => {
  if (props.isFollowing) {
    emit('unfollow', props.user.id)
  } else {
    emit('follow', props.user.id)
  }
}

const handleClick = () => {
  emit('click', props.user.id)
}
</script>

<template>
  <div 
    class="bg-white rounded-2xl p-4 flex items-center gap-4 hover:shadow-md transition-all cursor-pointer"
    @click="handleClick"
  >
    <!-- 头像 -->
    <div class="relative flex-shrink-0">
      <div 
        v-if="user.avatar"
        class="w-14 h-14 rounded-full overflow-hidden"
      >
        <img 
          :src="user.avatar" 
          :alt="user.name"
          class="w-full h-full object-cover"
        />
      </div>
      <div 
        v-else
        class="w-14 h-14 rounded-full bg-gray-900 flex items-center justify-center"
      >
        <i class="fa-solid fa-user text-white text-xl"></i>
      </div>
      
      <!-- 认证标识 -->
      <div 
        v-if="user.verified"
        class="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-lime-500 rounded-full flex items-center justify-center border-2 border-white"
      >
        <i class="fa-solid fa-check text-white text-xs"></i>
      </div>
    </div>

    <!-- 用户信息 -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <h3 class="text-lg font-semibold text-gray-900 truncate">
          {{ user.name }}
        </h3>
        <i 
          v-if="user.verified"
          class="fa-solid fa-circle-check text-lime-500 text-sm"
        ></i>
      </div>
      <p class="text-gray-400 text-sm truncate mt-0.5">
        {{ user.bio || '这个人很懒，什么都没有写~' }}
      </p>
    </div>

    <!-- 关注按钮 -->
    <button
      class="flex-shrink-0 px-5 py-2.5 rounded-full font-medium text-sm transition-all"
      :class="isFollowing 
        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
        : 'bg-lime-500 text-white hover:bg-lime-600'"
      @click.stop="handleFollow"
    >
      <span v-if="isFollowing">已关注</span>
      <span v-else>+ 关注</span>
    </button>
  </div>
</template>

<style scoped>
.bg-white {
  will-change: transform, box-shadow;
}
</style>
