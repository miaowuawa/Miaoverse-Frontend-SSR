<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  compact?: boolean
}>()

// 游戏状态
const board = ref<number[][]>([
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
])
const score = ref(0)
const bestScore = ref(0)
const gameOver = ref(false)
const won = ref(false)

// 初始化游戏
const initGame = () => {
  board.value = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]
  score.value = 0
  gameOver.value = false
  won.value = false
  addRandomTile()
  addRandomTile()
}

// 添加随机方块
const addRandomTile = () => {
  const emptyCells: { r: number; c: number }[] = []
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board.value[r][c] === 0) {
        emptyCells.push({ r, c })
      }
    }
  }
  if (emptyCells.length > 0) {
    const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)]
    board.value[r][c] = Math.random() < 0.9 ? 2 : 4
  }
}

// 移动和合并逻辑
const move = (direction: 'up' | 'down' | 'left' | 'right') => {
  if (gameOver.value) return

  let moved = false
  const newBoard = board.value.map(row => [...row])

  const slide = (arr: number[]) => {
    // 过滤掉0
    let filtered = arr.filter(val => val !== 0)
    // 合并相同的数字
    for (let i = 0; i < filtered.length - 1; i++) {
      if (filtered[i] === filtered[i + 1]) {
        filtered[i] *= 2
        score.value += filtered[i]
        if (filtered[i] === 2048 && !won.value) {
          won.value = true
        }
        filtered[i + 1] = 0
      }
    }
    // 再次过滤
    filtered = filtered.filter(val => val !== 0)
    // 补0
    while (filtered.length < 4) {
      filtered.push(0)
    }
    return filtered
  }

  if (direction === 'left' || direction === 'right') {
    for (let r = 0; r < 4; r++) {
      const row = [...newBoard[r]]
      const newRow = direction === 'left' ? slide(row) : slide(row.reverse()).reverse()
      if (JSON.stringify(row) !== JSON.stringify(newRow)) {
        moved = true
      }
      newBoard[r] = newRow
    }
  } else {
    for (let c = 0; c < 4; c++) {
      const col = [newBoard[0][c], newBoard[1][c], newBoard[2][c], newBoard[3][c]]
      const newCol = direction === 'up' ? slide(col) : slide(col.reverse()).reverse()
      if (JSON.stringify(col) !== JSON.stringify(newCol)) {
        moved = true
      }
      for (let r = 0; r < 4; r++) {
        newBoard[r][c] = newCol[r]
      }
    }
  }

  if (moved) {
    board.value = newBoard
    addRandomTile()
    if (score.value > bestScore.value) {
      bestScore.value = score.value
    }
    checkGameOver()
  }
}

// 检查游戏是否结束
const checkGameOver = () => {
  // 检查是否有空格
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board.value[r][c] === 0) return
    }
  }
  // 检查是否可以合并
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const val = board.value[r][c]
      if (
        (r < 3 && board.value[r + 1][c] === val) ||
        (c < 3 && board.value[r][c + 1] === val)
      ) {
        return
      }
    }
  }
  gameOver.value = true
}

// 键盘事件处理
const handleKeydown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      e.preventDefault()
      move('up')
      break
    case 'ArrowDown':
    case 's':
    case 'S':
      e.preventDefault()
      move('down')
      break
    case 'ArrowLeft':
    case 'a':
    case 'A':
      e.preventDefault()
      move('left')
      break
    case 'ArrowRight':
    case 'd':
    case 'D':
      e.preventDefault()
      move('right')
      break
  }
}

// 触摸事件处理
let touchStartX = 0
let touchStartY = 0

const handleTouchStart = (e: TouchEvent) => {
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
}

const handleTouchEnd = (e: TouchEvent) => {
  const touchEndX = e.changedTouches[0].clientX
  const touchEndY = e.changedTouches[0].clientY
  const dx = touchEndX - touchStartX
  const dy = touchEndY - touchStartY
  const minSwipeDistance = 50

  if (Math.abs(dx) > Math.abs(dy)) {
    if (Math.abs(dx) > minSwipeDistance) {
      move(dx > 0 ? 'right' : 'left')
    }
  } else {
    if (Math.abs(dy) > minSwipeDistance) {
      move(dy > 0 ? 'down' : 'up')
    }
  }
}

// 获取方块颜色
const getTileColor = (value: number) => {
  const colors: Record<number, string> = {
    0: 'bg-gray-100',
    2: 'bg-gray-200 text-gray-700',
    4: 'bg-gray-300 text-gray-700',
    8: 'bg-orange-200 text-gray-800',
    16: 'bg-orange-300 text-white',
    32: 'bg-orange-400 text-white',
    64: 'bg-orange-500 text-white',
    128: 'bg-yellow-300 text-white',
    256: 'bg-yellow-400 text-white',
    512: 'bg-yellow-500 text-white',
    1024: 'bg-lime-400 text-white',
    2048: 'bg-lime-500 text-white',
  }
  return colors[value] || 'bg-lime-600 text-white'
}

// 获取方块字体大小
const getTileFontSize = (value: number) => {
  if (value >= 1000) return 'text-lg'
  if (value >= 100) return 'text-xl'
  return 'text-2xl'
}

onMounted(() => {
  initGame()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="flex flex-col items-center">
    <!-- 分数显示 -->
    <div class="flex gap-4 mb-4">
      <div class="bg-gray-800 text-white px-4 py-2 rounded-lg text-center">
        <div class="text-xs text-gray-400">得分</div>
        <div class="text-xl font-bold">{{ score }}</div>
      </div>
      <div class="bg-gray-700 text-white px-4 py-2 rounded-lg text-center">
        <div class="text-xs text-gray-400">最高分</div>
        <div class="text-xl font-bold">{{ bestScore }}</div>
      </div>
    </div>

    <!-- 游戏板 -->
    <div
      class="relative bg-gray-300 rounded-xl p-2 touch-none select-none"
      :class="compact ? 'w-64' : 'w-80'"
      @touchstart="handleTouchStart"
      @touchend="handleTouchEnd"
    >
      <!-- 背景网格 - 使用 aspect-square 确保正方形 -->
      <div class="grid grid-cols-4 gap-2 aspect-square">
        <div
          v-for="i in 16"
          :key="`bg-${i}`"
          class="bg-gray-400 rounded-lg aspect-square"
        />
      </div>

      <!-- 数字方块 - 使用绝对定位覆盖在背景上 -->
      <div class="absolute inset-2 grid grid-cols-4 gap-2">
        <div
          v-for="(row, r) in board"
          :key="`row-${r}`"
          class="contents"
        >
          <div
            v-for="(cell, c) in row"
            :key="`cell-${r}-${c}`"
            class="rounded-lg flex items-center justify-center font-bold transition-all duration-150 aspect-square"
            :class="[
              getTileColor(cell),
              compact ? 'text-lg' : getTileFontSize(cell),
            ]"
          >
            {{ cell !== 0 ? cell : '' }}
          </div>
        </div>
      </div>

      <!-- 游戏结束覆盖层 -->
      <div
        v-if="gameOver || won"
        class="absolute inset-0 bg-black/50 rounded-xl flex flex-col items-center justify-center"
      >
        <div class="text-3xl font-bold text-white mb-2">
          {{ won ? '你赢了！' : '游戏结束' }}
        </div>
        <div class="text-white mb-4">最终得分: {{ score }}</div>
        <button
          class="px-6 py-2 bg-lime-500 text-white rounded-lg font-medium hover:bg-lime-600 transition-colors"
          @click="initGame"
        >
          再玩一次
        </button>
      </div>
    </div>

    <!-- 控制按钮 -->
    <div class="mt-4 grid grid-cols-3 gap-2">
      <div />
      <button
        class="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-300 transition-colors"
        @click="move('up')"
      >
        <i class="fa-solid fa-arrow-up text-gray-600"></i>
      </button>
      <div />
      <button
        class="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-300 transition-colors"
        @click="move('left')"
      >
        <i class="fa-solid fa-arrow-left text-gray-600"></i>
      </button>
      <button
        class="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-300 transition-colors"
        @click="move('down')"
      >
        <i class="fa-solid fa-arrow-down text-gray-600"></i>
      </button>
      <button
        class="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-300 transition-colors"
        @click="move('right')"
      >
        <i class="fa-solid fa-arrow-right text-gray-600"></i>
      </button>
    </div>

    <!-- 新游戏按钮 -->
    <button
      class="mt-4 px-6 py-2 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
      @click="initGame"
    >
      新游戏
    </button>

    <!-- 操作说明 -->
    <p class="mt-3 text-sm text-gray-500 text-center">
      使用方向键或 WASD 移动，合并相同数字达到 2048！
    </p>
  </div>
</template>
