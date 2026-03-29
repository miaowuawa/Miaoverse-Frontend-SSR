<script setup lang="ts">
import SidebarLeft from '~/components/container/SidebarLeft.vue'
import SidebarRight from '~/components/container/SidebarRight.vue'
import AnnouncementCard from '~/components/AnnouncementCard.vue'
import LoginModal from '~/components/modal/LoginModal.vue'
import SearchModal from '~/components/modal/SearchModal.vue'

useHead({
  title: '公告 - Miaoverse',
})

// 登录和搜索对话框状态
const showLoginModal = ref(false)
const showSearchModal = ref(false)

// 公告数据
const announcements = [
  {
    id: '1',
    date: '2026年3月29日',
    author: '管理组',
    title: '关于禁止违法违规内容的通知',
    content: `近期发现部分用户发送违法违规内容。
再次声明，严禁违反互联网法规的内容。严格遵守"九不准"政策。
禁止违反"九不准"的违法和不良信息：
1、反对宪法所确定的基本原则的；
2、危害国家安全，泄露国家秘密，颠覆国家政权，破坏国家统一的；
3、损害国家荣誉和利益的；
4、煽动民族仇恨、民族歧视，破坏民族团结的；
5、破坏国家宗教政策，宣扬邪教和封建迷信的；
6、散布谣言，扰乱社会秩序，破坏社会稳定的；
7、散布淫秽、色情、赌博、暴力、凶杀、恐怖或者教唆犯罪的；
8、侮辱或者诽谤他人，侵害他人合法权益的；
9、含有法律、行政法规禁止的其他内容的。
以上内容发现封禁账号。`,
  },
  {
    id: '2',
    date: '2026年3月28日',
    author: '管理组',
    title: '平台维护通知',
    content: `亲爱的用户：

为了提供更优质的服务，我们将于今晚 00:00-04:00 进行系统维护。
维护期间可能出现短暂的服务中断，请您提前做好准备。

感谢您的理解与支持！`,
  },
  {
    id: '3',
    date: '2026年3月25日',
    author: '运营团队',
    title: '新功能上线：图片预览',
    content: `大家好！

我们很高兴地宣布，图片预览功能现已上线！

新功能包括：
• 点击图片即可预览
• 支持缩放、旋转、拖拽
• 支持键盘导航
• 支持全屏查看

快来体验吧！`,
  },
]

const handleCardClick = (id: string) => {
  console.log('点击公告:', id)
  // TODO: 跳转到公告详情页
}

const handleLogin = () => {
  showLoginModal.value = true
}

const handleSearch = () => {
  showSearchModal.value = true
}

const handleLoginSubmit = (data: { phone: string; code: string }) => {
  console.log('Login submit:', data)
}

const handleQQLogin = () => {
  console.log('QQ login')
}

const handleSearchSubmit = (keyword: string) => {
  console.log('Search:', keyword)
}

const handleSearchSelect = (item: any) => {
  console.log('Select:', item)
}
</script>

<template>
  <div class="flex min-h-screen bg-bg-light">
    <!-- 左侧边栏 -->
    <SidebarLeft
      @login="handleLogin"
      @search="handleSearch"
    />

    <!-- 中间内容区 -->
    <div class="flex-1 ml-64 mr-80">
      <div class="p-6">
        <h1 class="text-2xl font-bold text-gray-900 mb-6">公告</h1>
        
        <!-- 公告列表 -->
        <div class="space-y-4 max-w-3xl">
          <AnnouncementCard
            v-for="item in announcements"
            :key="item.id"
            :date="item.date"
            :author="item.author"
            :title="item.title"
            :content="item.content"
            @click="handleCardClick(item.id)"
          />
        </div>
      </div>
    </div>

    <!-- 右侧边栏 -->
    <SidebarRight />

    <!-- 登录对话框 -->
    <LoginModal
      v-model:visible="showLoginModal"
      @login="handleLoginSubmit"
      @qq-login="handleQQLogin"
    />

    <!-- 搜索对话框 -->
    <SearchModal
      v-model:visible="showSearchModal"
      @search="handleSearchSubmit"
      @select="handleSearchSelect"
    />
  </div>
</template>
