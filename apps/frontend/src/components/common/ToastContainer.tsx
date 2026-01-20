import type { ToastType } from '@/contexts/ToastContext'
import { AlertCircleIcon } from '@/components/Icons'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/utils/cn'

const toastTypeStyles: Record<ToastType, string> = {
  error: 'text-primary',
  success: 'text-green-500',
  info: 'text-gray',
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-32 left-1/2 -translate-x-1/2 z-80 flex flex-col gap-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={cn(
            'bg-white px-4 flex items-center gap-2 py-3 rounded-lg shadow-lg cursor-pointer',
            toast.isLeaving ? 'animate-fade-out' : 'animate-slide-up',
          )}
          onClick={() => removeToast(toast.id)}
          role="alert"
        >
          <AlertCircleIcon className={cn('size-6', toastTypeStyles[toast.type])} />
          <p className="text-base font-semibold">{toast.message}</p>
        </div>
      ))}
    </div>
  )
}
