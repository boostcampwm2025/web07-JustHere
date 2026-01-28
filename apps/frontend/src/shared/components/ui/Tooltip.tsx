import { useState, type ReactNode } from 'react'
import { cn } from '@/shared/utils'

type Position = 'top' | 'bottom' | 'left' | 'right'
type Align = 'start' | 'center' | 'end'

interface TooltipProps {
  children: ReactNode
  content: ReactNode
  position?: Position
  align?: Align
  className?: string
  contentClassName?: string
}

export const Tooltip = ({ children, content, position = 'top', align = 'center', className, contentClassName }: TooltipProps) => {
  const [isHovered, setIsHovered] = useState(false)

  const positionClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2',
  }

  const alignClasses = {
    top: {
      start: 'left-0',
      center: 'left-1/2 -translate-x-1/2',
      end: 'right-0',
    },
    bottom: {
      start: 'left-0',
      center: 'left-1/2 -translate-x-1/2',
      end: 'right-0',
    },
    left: {
      start: 'top-0',
      center: 'top-1/2 -translate-y-1/2',
      end: 'bottom-0',
    },
    right: {
      start: 'top-0',
      center: 'top-1/2 -translate-y-1/2',
      end: 'bottom-0',
    },
  }

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 -mt-1.5 border-t-gray-900 border-r-transparent border-b-transparent border-l-transparent border-t-[6px] border-r-[6px] border-b-0 border-l-[6px]',
    bottom:
      'bottom-full left-1/2 -translate-x-1/2 -mb-1.5 border-b-gray-900 border-r-transparent border-t-transparent border-l-transparent border-b-[6px] border-r-[6px] border-t-0 border-l-[6px]',
    left: 'left-full top-1/2 -translate-y-1/2 -ml-1.5 border-l-gray-900 border-t-transparent border-b-transparent border-r-transparent border-l-[6px] border-t-[6px] border-b-[6px] border-r-0',
    right:
      'right-full top-1/2 -translate-y-1/2 -mr-1.5 border-r-gray-900 border-t-transparent border-b-transparent border-l-transparent border-r-[6px] border-t-[6px] border-b-[6px] border-l-0',
  }

  return (
    <div className={cn('relative inline-block', className)} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      {children}
      {isHovered && (
        <div
          className={cn(
            'absolute z-50 px-3 py-1.5 bg-gray-800 text-white text-sm rounded-lg shadow-lg whitespace-nowrap',
            positionClasses[position],
            alignClasses[position][align],
            contentClassName,
          )}
        >
          {content}
          <div className={cn('absolute w-0 h-0', arrowClasses[position])} />
        </div>
      )}
    </div>
  )
}
