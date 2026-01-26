import { BackspaceIcon } from '@/shared/assets'
import { Button } from '@/shared/components'
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
      className="fixed z-100 bg-white border border-gray-200 shadow-lg rounded-md  min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
      style={{ top: position.y, left: position.x }}
      onContextMenu={e => e.preventDefault()}
    >
      <Button
        onClick={onDelete}
        icon={<BackspaceIcon className="w-4 h-4" />}
        iconPosition="right"
        variant="ghost"
        size="sm"
        className="w-full justify-between h-12 text-red-600 hover:bg-red-50"
      >
        <span>삭제 (Delete)</span>
      </Button>
    </div>
  )
}
