import { useEffect, useState } from 'react'
import type { ToolType } from '@/shared/types'

interface UseCanvasKeyboardOptions {
  onPlaceCardCanceled: () => void
  hasSelectedItems: boolean
  handleDeleteSelectedItems: () => void
  isChatActive: boolean
  activateCursorChat: () => void
  isDrawing: boolean
  cancelDrawing: (reason: 'tool-change' | 'mouse-leave' | 'space-press') => void
  handleToolChange: (tool: ToolType) => void
}

/**
 * 캔버스 키보드 이벤트를 통합 관리하는 훅
 *
 * - Escape: 장소 카드 배치 취소, 그리기 취소, 툴 초기화(cursor)
 * - Backspace: 선택된 아이템 삭제
 * - '/': 커서 채팅 활성화
 * - Space: Hand 모드 토글 (누르고 있는 동안)
 */
export const useCanvasKeyboard = ({
  onPlaceCardCanceled,
  hasSelectedItems,
  handleDeleteSelectedItems,
  isChatActive,
  activateCursorChat,
  isDrawing,
  cancelDrawing,
  handleToolChange,
}: UseCanvasKeyboardOptions) => {
  const [isSpacePressed, setIsSpacePressed] = useState(false)

  useEffect(() => {
    const isInputElement = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof HTMLElement)) return false
      const tagName = target.tagName
      return tagName === 'INPUT' || tagName === 'TEXTAREA' || target.isContentEditable
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape: 장소 카드 배치 취소, 그리기 취소, 툴 초기화
      if (e.key === 'Escape') {
        onPlaceCardCanceled()
        handleToolChange('cursor')
        return
      }

      // 입력 필드에서는 나머지 단축키 무시
      if (isInputElement(e.target)) return

      // Backspace: 선택 아이템 삭제
      if (e.key === 'Backspace' && hasSelectedItems) {
        e.preventDefault()
        handleDeleteSelectedItems()
        return
      }

      // '/': 커서 채팅 활성화
      if (e.key === '/') {
        if (isChatActive) return
        e.preventDefault()
        activateCursorChat()
        return
      }

      // Space: Hand 모드 토글
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        if (isDrawing) {
          cancelDrawing('space-press')
        }
        setIsSpacePressed(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [onPlaceCardCanceled, hasSelectedItems, handleDeleteSelectedItems, isChatActive, activateCursorChat, isDrawing, cancelDrawing, handleToolChange])

  return { isSpacePressed }
}
