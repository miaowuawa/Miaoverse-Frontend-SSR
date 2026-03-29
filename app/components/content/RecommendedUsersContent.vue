<script setup lang="ts">
import { ref } from 'vue'
import SingleUserComponent from '~/components/SingleUserComponent.vue'

// 推荐用户数据
const recommendedUsers = ref([
  {
    id: 'u1',
    name: '要乐奈',
    bio: '这里是我的个性签名......',
    verified: true,
    isFollowing: false,
  },
  {
    id: 'u2',
    name: '千早爱音',
    bio: 'MyGO!!!!! 吉他手 🎸',
    avatar: 'https://storage.moegirl.org.cn/moegirl/commons/d/d2/Chihaya_Anon_icon.png',
    verified: true,
    isFollowing: true,
  },
  {
    id: 'u3',
    name: '高松灯',
    bio: '寻找属于自己的歌',
    verified: true,
    isFollowing: false,
  },
  {
    id: 'u4',
    name: '长崎爽世',
    bio: 'MyGO 贝斯手（才没有和爱音谈恋爱！）',
    verified: true,
    isFollowing: false,
  },
  {
    id: 'u5',
    name: '椎名立希',
    bio: '鼓手 | 作曲',
    verified: true,
    isFollowing: false,
  },
])

const emit = defineEmits<{
  (e: 'follow', userId: string): void
  (e: 'unfollow', userId: string): void
  (e: 'user-click', userId: string): void
}>()

const handleUserFollow = (userId: string) => {
  const user = recommendedUsers.value.find(u => u.id === userId)
  if (user) {
    user.isFollowing = true
  }
  emit('follow', userId)
}

const handleUserUnfollow = (userId: string) => {
  const user = recommendedUsers.value.find(u => u.id === userId)
  if (user) {
    user.isFollowing = false
  }
  emit('unfollow', userId)
}

const handleUserClick = (userId: string) => {
  emit('user-click', userId)
}
</script>

<template>
  <div class="flex-1 p-4">
    <div class="max-w-2xl mx-auto">
      <h2 class="text-xl font-bold text-gray-900 mb-4 px-2">推荐用户</h2>
      <div class="space-y-3">
        <SingleUserComponent
          v-for="user in recommendedUsers"
          :key="user.id"
          :user="user"
          :is-following="user.isFollowing"
          @follow="handleUserFollow"
          @unfollow="handleUserUnfollow"
          @click="handleUserClick"
        />
      </div>
    </div>
  </div>
</template>
