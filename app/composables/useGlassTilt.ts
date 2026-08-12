import { onMounted, onBeforeUnmount } from 'vue'

/**
 * useGlassTilt
 *
 * 为信息流类卡片绑定「鼠标跟随动态光斑 + 微微倾斜」效果，针对性能做了多重保护：
 *
 * 1. 仅在 hover 时激活（mouseenter / mousemove / mouseleave / mousedown）
 * 2. 使用 requestAnimationFrame 节流 mousemove，一帧最多更新一次
 * 3. 自动检测以下情况并完全禁用效果（只保留静态玻璃质感）：
 *    - prefers-reduced-motion === reduce
 *    - 触屏设备（pointer: coarse）
 *    - navigator.deviceMemory <= 4（低内存设备，给 <html> 加 .low-perf 类）
 *    - 窄屏（<= 768px，由 CSS 媒体查询兜底）
 * 4. 所有视觉变化只操作 transform / opacity / CSS 自定义属性，
 *    全部走合成层，不触发 layout / paint
 *
 * 注意：这里用 mouse 事件而非 pointer 事件。Chromium/Edge 在页面获得
 * 首次用户手势（点击）之前不会派发 pointerenter/pointermove/pointerleave，
 * 会导致「必须先点一下页面动效才生效」；mouse 事件无此限制。
 * 触屏设备已通过 (pointer: coarse) 检测禁用，桌面端 mouse 事件足够。
 *
 * 用法：
 *   <div ref="cardRef" class="glass-card glass-card-feed glass-tilt">...</div>
 *   const cardRef = useGlassTilt()
 *
 * 卡片需要满足：
 *   - 带 .glass-card-feed（激活 ::before 光斑 / ::after 高光层）
 *   - 带 .glass-tilt（激活 transform 倾斜）
 *   - 内容包在直接子元素里（已通过 .glass-card-feed > * 提升层级）
 */

const MAX_TILT = 3 // 最大倾斜角度（度），轻量克制
const SMOOTH = 0.2 // 指数平滑系数，越小越柔
const SETTLE_EPS = 0.004 // 回归水平位的收敛阈值
const RAF_TIMEOUT = 120 // 超过 120ms 没 rAF 回调则视为卡顿，降级关闭

export function useGlassTilt() {
  const cardRef = ref<HTMLElement | null>(null)

  let rafId = 0
  let lastFrame = 0
  let targetX = 0.5
  let targetY = 0.5
  let curX = 0.5
  let curY = 0.5
  let active = false
  let settling = false
  let disabled = false
  let lowPerfChecked = false

  const computeDisabled = () => {
    if (typeof window === 'undefined') return true
    const mq = window.matchMedia
    const reduce =
      mq('(prefers-reduced-motion: reduce)').matches
    const coarse = mq('(pointer: coarse)').matches
    const lowMem =
      (navigator as any).deviceMemory !== undefined &&
      (navigator as any).deviceMemory <= 4
    const small = window.innerWidth <= 768
    return reduce || coarse || lowMem || small
  }

  const ensureLowPerfClass = () => {
    if (lowPerfChecked || typeof document === 'undefined') return
    lowPerfChecked = true
    const lowMem =
      (navigator as any).deviceMemory !== undefined &&
      (navigator as any).deviceMemory <= 4
    if (lowMem) document.documentElement.classList.add('low-perf')
  }

  const apply = () => {
    rafId = 0
    const el = cardRef.value
    if (!el || disabled) return

    // 指数平滑，让倾斜有「弹性手感」
    curX += (targetX - curX) * SMOOTH
    curY += (targetY - curY) * SMOOTH

    // 倾斜：鼠标在左侧 -> 卡片右端下沉（rotateY 正向）
    const ry = (curX - 0.5) * 2 * MAX_TILT
    const rx = -(curY - 0.5) * 2 * MAX_TILT
    el.style.setProperty('--rx', rx.toFixed(2) + 'deg')
    el.style.setProperty('--ry', ry.toFixed(2) + 'deg')

    // 光斑位置（百分比）
    el.style.setProperty('--mx', (curX * 100).toFixed(1) + '%')
    el.style.setProperty('--my', (curY * 100).toFixed(1) + '%')

    const now = performance.now()
    // 若上一帧距今太久，说明设备掉帧严重，关闭后续动效
    if (lastFrame && now - lastFrame > RAF_TIMEOUT) {
      disableEffect()
      return
    }
    lastFrame = now

    if (active) {
      // 悬停中：持续跟手
      rafId = requestAnimationFrame(apply)
      return
    }
    if (settling) {
      // 离开后：继续平滑回正，直到完全水平再停
      const dx = Math.abs(curX - 0.5)
      const dy = Math.abs(curY - 0.5)
      if (dx > SETTLE_EPS || dy > SETTLE_EPS) {
        rafId = requestAnimationFrame(apply)
      } else {
        settling = false
        curX = 0.5
        curY = 0.5
      }
    }
  }

  const disableEffect = () => {
    disabled = true
    const el = cardRef.value
    if (!el) return
    el.style.setProperty('--ma', '0')
    el.style.setProperty('--ha', '0')
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
    if (rafId) cancelAnimationFrame(rafId)
    rafId = 0
  }

  const onEnter = () => {
    if (disabled) return
    active = true
    settling = false
    const el = cardRef.value
    if (!el) return
    el.style.setProperty('--ma', '1')
    el.style.setProperty('--ha', '1')
    lastFrame = 0
    if (!rafId) rafId = requestAnimationFrame(apply)
  }

  const onMove = (e: MouseEvent) => {
    if (disabled) return
    const el = cardRef.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    targetX = (e.clientX - rect.left) / rect.width
    targetY = (e.clientY - rect.top) / rect.height
    // 没有在跑就起一帧（rAF 节流）
    if (active && !rafId) rafId = requestAnimationFrame(apply)
  }

  const onLeave = () => {
    active = false
    settling = true
    const el = cardRef.value
    if (!el) return
    targetX = 0.5
    targetY = 0.5
    el.style.setProperty('--ma', '0')
    el.style.setProperty('--ha', '0')
    // 让平滑回正再停（apply 里持续收敛到水平位）
    if (!rafId) rafId = requestAnimationFrame(apply)
  }

  const onDown = () => {
    // 按下时暂时压低倾斜幅度，避免点击误触
    const el = cardRef.value
    if (el && !disabled) {
      el.style.setProperty('--rx', '0deg')
      el.style.setProperty('--ry', '0deg')
    }
  }

  onMounted(() => {
    ensureLowPerfClass()
    const el = cardRef.value
    if (!el || computeDisabled()) {
      disabled = true
      return
    }
    el.addEventListener('mouseenter', onEnter as EventListener, { passive: true })
    el.addEventListener('mousemove', onMove as EventListener, { passive: true })
    el.addEventListener('mouseleave', onLeave as EventListener, { passive: true })
    el.addEventListener('mousedown', onDown as EventListener, { passive: true })
  })

  onBeforeUnmount(() => {
    const el = cardRef.value
    if (el) {
      el.removeEventListener('mouseenter', onEnter as EventListener)
      el.removeEventListener('mousemove', onMove as EventListener)
      el.removeEventListener('mouseleave', onLeave as EventListener)
      el.removeEventListener('mousedown', onDown as EventListener)
    }
    if (rafId) cancelAnimationFrame(rafId)
  })

  return cardRef
}