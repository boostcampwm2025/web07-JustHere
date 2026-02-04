import React, { useRef, useEffect } from 'react'
import { getParticipantColor, cn } from '@/shared/utils'
import { useToast } from '@/shared/hooks'
import { MAX_CURSOR_CHAT_LENGTH } from '@/pages/room/constants'

interface CursorChatInputProps {
  position: { x: number; y: number }
  name: string
  isFading: boolean
  message: string
  onMessageChange: (value: string) => void
  onEscape: () => void
}

export const CursorChatInput = ({ position, name, isFading, message, onMessageChange, onEscape }: CursorChatInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const toastShownRef = useRef(false)
  const { showToast } = useToast()

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    if (newValue.length > MAX_CURSOR_CHAT_LENGTH) {
      if (!toastShownRef.current) {
        toastShownRef.current = true
        showToast(`메시지는 ${MAX_CURSOR_CHAT_LENGTH}자까지 입력할 수 있습니다.`, 'error')
      }
      return
    }
    toastShownRef.current = false
    onMessageChange(newValue)
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
      <div className="relative inline-block">
        <span className="invisible whitespace-pre px-3 py-1.5 text-sm min-w-[100px] inline-block">{message || '메시지 입력...'}</span>
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="메시지 입력..."
          className={cn(
            'absolute inset-0 px-3 py-1.5 text-sm text-white placeholder-blue-200 rounded-lg shadow-lg border-none outline-none w-full',
            getParticipantColor(name),
          )}
        />
      </div>
    </div>
  )
}
