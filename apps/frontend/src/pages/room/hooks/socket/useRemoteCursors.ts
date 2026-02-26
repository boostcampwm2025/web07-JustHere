import { useCallback, useRef, useState } from 'react'
import type { CursorInfo, CursorInfoWithId, YjsAwarenessBroadcast } from '@/shared/types'

interface UseRemoteCursorsOptions {
  userName: string
}

export const useRemoteCursors = ({ userName }: UseRemoteCursorsOptions) => {
  const [cursors, setCursors] = useState<Map<string, CursorInfoWithId>>(new Map())
  const cursorPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const cursorChatRef = useRef<{ chatActive: boolean; chatMessage: string }>({ chatActive: false, chatMessage: '' })

  const updateCursorPosition = useCallback(
    (x: number, y: number): CursorInfo => {
      cursorPositionRef.current = { x, y }
      const chatState = cursorChatRef.current
      return {
        x,
        y,
        name: userName,
        chatActive: chatState.chatActive,
        chatMessage: chatState.chatMessage,
      }
    },
    [userName],
  )

  const updateCursorChatState = useCallback(
    (chatActive: boolean, chatMessage?: string) => {
      cursorChatRef.current = { chatActive, chatMessage: chatMessage ?? '' }
      const { x, y } = cursorPositionRef.current
      return {
        x,
        y,
        name: userName,
        chatActive,
        chatMessage,
      }
    },
    [userName],
  )

  const applyRemoteAwareness = useCallback((payload: YjsAwarenessBroadcast) => {
    const cursor = payload.state.cursor
    if (cursor) {
      setCursors(prev => {
        const next = new Map(prev)
        next.set(payload.socketId, {
          x: cursor.x,
          y: cursor.y,
          name: cursor.name,
          chatActive: cursor.chatActive,
          chatMessage: cursor.chatMessage,
          socketId: payload.socketId,
        })
        return next
      })
      return
    }

    setCursors(prev => {
      const next = new Map(prev)
      next.delete(payload.socketId)
      return next
    })
  }, [])

  const clearCursors = useCallback(() => {
    setCursors(new Map())
  }, [])

  return {
    cursors,
    updateCursorPosition,
    updateCursorChatState,
    applyRemoteAwareness,
    clearCursors,
  }
}
