import { useRef, useEffect, type ReactNode, type HTMLAttributes } from 'react'
import { cn } from '@/shared/utils'

type Align = 'left' | 'right' | 'center'

interface DropdownProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  onOpenChange: (open: boolean) => void
  align?: Align
  className?: string
  ignoreRef?: React.RefObject<HTMLElement | null> | React.RefObject<HTMLElement | null>[]
}

export const Dropdown = ({ children, onOpenChange, align = 'left', className, ignoreRef, ...props }: DropdownProps) => {
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      const target = event.target as Node
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        if (ignoreRef) {
          const refs = Array.isArray(ignoreRef) ? ignoreRef : [ignoreRef]
          if (refs.some(ref => ref.current?.contains(target))) {
            return
          }
        }
        onOpenChange(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onOpenChange, ignoreRef])

  const alignClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  }

  return (
    <div
      ref={dropdownRef}
      className={cn('absolute top-full mt-2 z-50 bg-white rounded-xl shadow-xl border border-gray-200', alignClasses[align], className)}
      {...props}
    >
      {children}
    </div>
  )
}
