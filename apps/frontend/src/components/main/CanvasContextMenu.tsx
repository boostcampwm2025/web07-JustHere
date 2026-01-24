import { BackspaceIcon } from '@/components/Icons'
import { useEffect, useRef } from 'react'

interface ContextMenuProps {
  position: { x: number; y: number }
  onDelete: () => void
  onClose: () => void
}

export const CanvasContextMenu = ({ position, onDelete, onClose }: ContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null)

  // 외부 영역 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 메뉴가 열려있고, 클릭된 타겟이 메뉴 내부가 아니라면 닫기
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
      // 우클릭 이벤트가 상위(Canvas)로 전파되어 또 다른 메뉴를 여는 것을 방지
      onContextMenu={e => e.preventDefault()}
    >
      {/* TODO: menu.map()으로 렌더링해도 좋을 듯 */}
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
