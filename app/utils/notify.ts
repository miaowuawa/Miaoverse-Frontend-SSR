// 统一的 antd notification 提示工具：
// - 成功/错误按类型弹出通知
// - 错误信息若携带自定义业务码（如 40301），追加在提示信息后的 () 内显示
import { notification } from 'ant-design-vue'
import { ApiRequestError } from '~/utils/api'

function withCode(msg: string, code: number | null | undefined): string {
  if (typeof code === 'number' && code > 0) {
    return `${msg}（${code}）`
  }
  return msg
}

/** 成功通知 */
export function notifySuccess(msg: string) {
  notification.success({
    message: '提示',
    description: msg,
    duration: 3,
  })
}

/** 错误通知：ApiRequestError 会自动追加自定义业务码 */
export function notifyError(err: unknown, fallbackMsg = '操作失败，请稍后重试') {
  if (err instanceof ApiRequestError) {
    notification.error({
      message: '操作失败',
      description: withCode(err.message || fallbackMsg, err.customCode),
      duration: 4,
    })
    return
  }
  notification.error({
    message: '操作失败',
    description: err instanceof Error ? err.message : fallbackMsg,
    duration: 4,
  })
}
