import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/shared/utils'

interface TooltipProps {
  children: ReactNode
  content: ReactNode
  className?: string
  contentClassName?: string
}

export const Tooltip = ({ children, content, className, contentClassName }: TooltipProps) => {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || !triggerRef.current) {
      return
    }
    setRect(triggerRef.current.getBoundingClientRect())
  }, [open])

  return (
    <div
      ref={triggerRef}
      className={cn('inline-block', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
    >
      {children}

      {open &&
        rect &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="tooltip"
            className={cn(
              'fixed z-100 px-3 py-1.5 bg-gray-800 text-white text-sm rounded-lg shadow-lg whitespace-nowrap -translate-x-1/2',
              contentClassName,
            )}
            style={{ left: rect.left + rect.width / 2, top: rect.bottom + 8 }}
          >
            {content}
          </div>,
          document.body,
        )}
    </div>
  )
}
