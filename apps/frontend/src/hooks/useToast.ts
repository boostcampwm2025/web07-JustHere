import { ToastContext } from '@/contexts/ToastContext'
import { useContext } from 'react'

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast는 ToastProvider 내에서 사용되어야 합니다.')
  }

  return context
}
