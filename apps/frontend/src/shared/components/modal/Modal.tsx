import type { HTMLAttributes, ReactNode } from 'react'
import { CloseIcon } from '@/shared/assets'
import { Button } from '@/shared/components'
import { cn } from '@/shared/utils'

interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  onClose: () => void
  children: ReactNode
  closeable?: boolean
}

export const Modal = ({ title, onClose, children, className, closeable = true }: ModalProps) => {
  return (
    <div className="fixed inset-0 z-60">
      <div className="absolute inset-0 bg-gray-500/50" onClick={onClose} />

      <div role="dialog" aria-modal="true" className={cn('absolute top-1/2 left-1/2 w-full -translate-x-1/2 -translate-y-1/2 max-w-2xl', className)}>
        <div className="bg-white shadow-xl border border-gray-100 rounded-3xl overflow-hidden flex flex-col h-full">
          <div className="flex items-center justify-between px-6 py-5">
            <h3 className="text-xl font-bold">{title}</h3>
            {closeable && (
              <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-disable hover:bg-transparent hover:text-gray">
                <CloseIcon className="w-6 h-6" />
              </Button>
            )}
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

Modal.Body = function ModalBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 pb-6', className)} {...props} />
}

Modal.Footer = function ModalFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex justify-end gap-2 bg-gray-50 px-6 py-4 border-t border-gray-200', className)} {...props} />
}
