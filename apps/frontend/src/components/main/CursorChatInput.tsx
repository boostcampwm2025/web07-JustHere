import React, { useRef, useEffect } from 'react'
import { cn } from '@/utils/cn'
import { getParticipantColor } from '@/utils/participant'

interface CursorChatInputProps {
  position: { x: number; y: number }
  name: string
  isFading: boolean
  message: string
  onMessageChange: (value: string) => void
  onEscape: () => void
}

/**
 * 커서챗 입력 컴포넌트
 * 위치 변경 시 이 컴포넌트만 리렌더링되어 부드러운 커서 추적 가능
 */
const CursorChatInput = React.memo(({ position, name, isFading, message, onMessageChange, onEscape }: CursorChatInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null)

  // 마운트 시 자동 포커스
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onMessageChange(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onEscape()
    }
  }

  return (
    <div
      className={cn('absolute z-50 pointer-events-auto', isFading ? 'opacity-0' : 'opacity-100')}
      style={{
        left: 0,
        top: 0,
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        willChange: 'transform',
        transition: isFading ? 'opacity 3s ease-out' : 'none',
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={message}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="메시지 입력..."
        className={cn(
          'px-3 py-1.5 text-sm text-white placeholder-blue-200 rounded-lg shadow-lg border-none outline-none w-[200px]',
          getParticipantColor(name),
        )}
      />
    </div>
  )
})

CursorChatInput.displayName = 'CursorChatInput'

export default CursorChatInput
