import { createContext } from 'react'

export type ToastType = 'error' | 'success' | 'info'

export type Toast = {
  id: string
  message: string
  type: ToastType
  isLeaving: boolean
}

type ToastContextValue = {
  toasts: Toast[]
  showToast: (message: string, type?: ToastType) => void
  removeToast: (id: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
