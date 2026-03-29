import { nextTick } from 'vue'
import Viewer from 'viewerjs'
import 'viewerjs/dist/viewer.css'

interface ImageViewerOptions {
  initialViewIndex?: number
  navbar?: boolean
  toolbar?: boolean
  title?: boolean
  tooltip?: boolean
  movable?: boolean
  zoomable?: boolean
  rotatable?: boolean
  scalable?: boolean
  transition?: boolean
  fullscreen?: boolean
  keyboard?: boolean
  backdrop?: boolean | string
  loop?: boolean
}

export function useImageViewer() {
  const openViewer = async (images: string[], initialIndex: number = 0, options: ImageViewerOptions = {}) => {
    // 创建临时容器
    const container = document.createElement('div')
    container.style.display = 'none'
    document.body.appendChild(container)

    // 创建图片列表
    const ul = document.createElement('ul')
    images.forEach((src) => {
      const li = document.createElement('li')
      const img = document.createElement('img')
      img.src = src
      img.style.maxWidth = '100%'
      li.appendChild(img)
      ul.appendChild(li)
    })
    container.appendChild(ul)

    await nextTick()

    // 初始化 Viewer
    const viewer = new Viewer(ul, {
      initialViewIndex: initialIndex,
      navbar: true,
      toolbar: true,
      title: false,
      tooltip: true,
      movable: true,
      zoomable: true,
      rotatable: true,
      scalable: true,
      transition: true,
      fullscreen: true,
      keyboard: true,
      backdrop: true,
      loop: false,
      ...options,
      hidden() {
        viewer.destroy()
        document.body.removeChild(container)
      },
    })

    // 显示预览
    viewer.show()

    return viewer
  }

  return {
    openViewer,
  }
}
