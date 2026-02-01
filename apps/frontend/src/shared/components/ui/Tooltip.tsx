import { useState, useRef, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
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
  portal?: boolean
}

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

const GAP = 8

function getPortalStyle(position: Position, align: Align, rect: DOMRect) {
  const base = 'fixed z-[100] px-3 py-1.5 bg-gray-800 text-white text-sm rounded-lg shadow-lg whitespace-nowrap'
  switch (position) {
    case 'bottom':
      if (align === 'start') {
        return {
          style: { left: rect.left, top: rect.bottom + GAP },
          className: base,
        }
      }
      if (align === 'end') {
        return {
          style: { right: window.innerWidth - rect.right, top: rect.bottom + GAP },
          className: base,
        }
      }
      return {
        style: { left: rect.left + rect.width / 2, top: rect.bottom + GAP, transform: 'translate(-50%, 0)' },
        className: base,
      }
    case 'top':
      if (align === 'start') {
        return {
          style: { left: rect.left, bottom: window.innerHeight - rect.top + GAP },
          className: base,
        }
      }
      if (align === 'end') {
        return {
          style: { right: window.innerWidth - rect.right, bottom: window.innerHeight - rect.top + GAP },
          className: base,
        }
      }
      return {
        style: { left: rect.left + rect.width / 2, top: rect.top - GAP, transform: 'translate(-50%, -100%)' },
        className: base,
      }
    case 'left':
      if (align === 'start') {
        return {
          style: { left: rect.left - GAP, top: rect.top, transform: 'translate(-100%, 0)' },
          className: base,
        }
      }
      if (align === 'end') {
        return {
          style: { left: rect.left - GAP, bottom: window.innerHeight - rect.bottom, transform: 'translate(-100%, 0)' },
          className: base,
        }
      }
      return {
        style: { left: rect.left - GAP, top: rect.top + rect.height / 2, transform: 'translate(-100%, -50%)' },
        className: base,
      }
    case 'right':
      if (align === 'start') {
        return {
          style: { left: rect.right + GAP, top: rect.top },
          className: base,
        }
      }
      if (align === 'end') {
        return {
          style: { left: rect.right + GAP, bottom: window.innerHeight - rect.bottom },
          className: base,
        }
      }
      return {
        style: { left: rect.right + GAP, top: rect.top + rect.height / 2, transform: 'translate(0, -50%)' },
        className: base,
      }
  }
}

export const Tooltip = ({ children, content, position = 'top', align = 'center', className, contentClassName, portal = false }: TooltipProps) => {
  const [isHovered, setIsHovered] = useState(false)
  const [portalRect, setPortalRect] = useState<DOMRect | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (portal && isHovered && triggerRef.current) {
      setPortalRect(triggerRef.current.getBoundingClientRect())
    } else if (!isHovered) {
      setPortalRect(null)
    }
  }, [portal, isHovered])

  const inlineContent = isHovered && !portal && (
    <div
      role="tooltip"
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
  )

  const portalStyle = portal && portalRect ? getPortalStyle(position, align, portalRect) : null

  const portalContent =
    portal && isHovered && portalRect && typeof document !== 'undefined' && portalStyle
      ? createPortal(
          <div role="tooltip" className={cn(portalStyle.className, contentClassName)} style={portalStyle.style}>
            {content}
            <div className={cn('absolute w-0 h-0', arrowClasses[position])} />
          </div>,
          document.body,
        )
      : null

  return (
    <div
      ref={portal ? triggerRef : undefined}
      className={cn('relative inline-block', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      tabIndex={0}
    >
      {children}
      {inlineContent}
      {portalContent}
    </div>
  )
}
