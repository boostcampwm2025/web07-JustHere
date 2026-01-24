import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from '@/shared/ui/icons/Icons'
import { Button } from '@/shared/ui/Button'
import { cn } from '@/shared/lib/cn'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
  contentClassName?: string
  overlayClassName?: string
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  contentClassName,
  overlayClassName,
  showCloseButton = true,
  closeOnOverlayClick = true,
}: ModalProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={cn('fixed inset-0 bg-gray-500/50 transition-opacity', overlayClassName)}
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        className={cn('relative w-full bg-white shadow-xl rounded-3xl border border-gray-100 flex flex-col max-h-[90vh]', className)}
        role="dialog"
        aria-modal="true"
      >
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 pb-4 shrink-0">
            <div className="flex flex-col gap-1">
              {typeof title === 'string' ? <h3 className="text-xl font-bold text-gray-900">{title}</h3> : title}
              {typeof description === 'string' ? <p className="text-sm text-gray-500">{description}</p> : description}
            </div>
            {showCloseButton && (
              <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-disable hover:bg-transparent hover:text-gray -mr-2 -mt-2">
                <CloseIcon className="w-6 h-6" />
              </Button>
            )}
          </div>
        )}
        <div className={cn('p-6 pt-2 overflow-y-auto', contentClassName)}>{children}</div>
        {footer && <div className="flex justify-end gap-2 bg-gray-50 p-4 rounded-b-3xl border-t border-gray-200 shrink-0">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
