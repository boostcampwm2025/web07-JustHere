import type Konva from 'konva'
import { useCallback, useRef, useState } from 'react'

export const useCursorChat = ({
  stageRef,
  sendCursorChat,
}: {
  stageRef: React.RefObject<Konva.Stage | null>
  sendCursorChat: (chatActive: boolean, chatMessage?: string) => void
}) => {
  const [isChatActive, setIsChatActive] = useState(false)
  const [isChatFading, setIsChatFading] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [chatInputPosition, setChatInputPosition] = useState<{ x: number; y: number } | null>(null)
  const chatInactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chatFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const deactivateCursorChat = useCallback(() => {
    if (chatInactivityTimerRef.current) {
      clearTimeout(chatInactivityTimerRef.current)
      chatInactivityTimerRef.current = null
    }
    if (chatFadeTimerRef.current) {
      clearTimeout(chatFadeTimerRef.current)
      chatFadeTimerRef.current = null
    }
    setIsChatFading(false)
    setIsChatActive(false)
    setChatMessage('')
    setChatInputPosition(null)
    sendCursorChat(false, '')
  }, [sendCursorChat])

  const startFadeOut = useCallback(() => {
    setIsChatFading(true)
    chatFadeTimerRef.current = setTimeout(() => {
      deactivateCursorChat()
    }, 3000)
  }, [deactivateCursorChat])

  const resetInactivityTimer = useCallback(() => {
    if (chatInactivityTimerRef.current) {
      clearTimeout(chatInactivityTimerRef.current)
    }
    if (chatFadeTimerRef.current) {
      clearTimeout(chatFadeTimerRef.current)
      chatFadeTimerRef.current = null
    }
    setIsChatFading(false)

    chatInactivityTimerRef.current = setTimeout(() => {
      startFadeOut()
    }, 3000)
  }, [startFadeOut])

  const activateCursorChat = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return

    const pointerPos = stage.getPointerPosition()
    if (pointerPos) {
      setChatInputPosition({ x: pointerPos.x + 20, y: pointerPos.y - 30 })
    }

    setIsChatActive(true)
    setChatMessage('')
    sendCursorChat(true, '')

    resetInactivityTimer()
  }, [stageRef, sendCursorChat, resetInactivityTimer])

  return {
    isChatActive,
    isChatFading,
    chatMessage,
    chatInputPosition,
    setChatInputPosition,
    activateCursorChat,
    deactivateCursorChat,
    setChatMessage,
    resetInactivityTimer,
  }
}
