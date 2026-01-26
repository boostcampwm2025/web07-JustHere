export type ToastType = 'error' | 'success' | 'info'

export type Toast = {
  id: string
  message: string
  type: ToastType
  isLeaving: boolean
}
