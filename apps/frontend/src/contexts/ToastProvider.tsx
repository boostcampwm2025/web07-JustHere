import { useCallback, useState, type ReactNode } from 'react'
import { ToastContext, type Toast, type ToastType } from './ToastContext'

type ToastProviderProps = {
  children: ReactNode
}

const TOAST_DURATION = 3000
const FADE_OUT_DURATION = 300

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const startLeaving = useCallback((id: string) => {
    setToasts(prev => prev.map(t => (t.id === id ? { ...t, isLeaving: true } : t)))

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, FADE_OUT_DURATION)
  }, [])

  const showToast = useCallback(
    (message: string, type: ToastType = 'error') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const toast: Toast = { id, message, type, isLeaving: false }

      setToasts(prev => [...prev, toast])

      setTimeout(() => {
        startLeaving(id)
      }, TOAST_DURATION)
    },
    [startLeaving],
  )

  const removeToast = useCallback(
    (id: string) => {
      startLeaving(id)
    },
    [startLeaving],
  )

  return <ToastContext.Provider value={{ toasts, showToast, removeToast }}>{children}</ToastContext.Provider>
}
