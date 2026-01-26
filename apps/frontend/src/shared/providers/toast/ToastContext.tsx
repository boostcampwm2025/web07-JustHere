import type { Toast, ToastType } from '@/shared/types'
import { createContext } from 'react'

type ToastContextValue = {
  toasts: Toast[]
  showToast: (message: string, type?: ToastType) => void
  removeToast: (id: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
