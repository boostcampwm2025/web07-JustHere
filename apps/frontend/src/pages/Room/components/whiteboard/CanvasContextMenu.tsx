import { BackspaceIcon } from '@/shared/ui/icons/Icons'
import { useEffect, useRef } from 'react'

interface ContextMenuProps {
  position: { x: number; y: number }
  onDelete: () => void
  onClose: () => void
}

export const CanvasContextMenu = ({ position, onDelete, onClose }: ContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] bg-white border border-gray-200 shadow-lg rounded-md py-1 min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
      style={{ top: position.y, left: position.x }}
      onContextMenu={e => e.preventDefault()}
    >
      <button
        onClick={onDelete}
        className="w-full flex items-center justify-between px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
      >
        <span>삭제 (Delete)</span>
        <BackspaceIcon className="w-4 h-4" />
      </button>
    </div>
  )
}
