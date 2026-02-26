import { useEffect, useRef, useCallback } from 'react'
import type { Socket } from 'socket.io-client'
import type { YjsAwarenessPayload } from '@/shared/types'
import { throttle, type ThrottledFunction } from '@/shared/utils'
import { useSocketClient } from '@/shared/hooks'
import { socketBaseUrl } from '@/shared/config/socket'
import { reportError } from '@/shared/utils'
import { CURSOR_FREQUENCY } from '@/pages/room/constants'
import { useCursorPresence } from '@/pages/room/hooks'
import { useCanvasCommands } from './useCanvasCommands'
import { useCanvasHistory } from './useCanvasHistory'
import { useCanvasTelemetry } from './useCanvasTelemetry'
import { useCanvasTransport } from './useCanvasTransport'
import { useYDocLifecycle } from './useYDocLifecycle'

interface UseYjsSocketOptions {
  roomId: string
  canvasId: string
  serverUrl?: string
  userName: string
}

export function useYjsSocket({ roomId, canvasId, userName }: UseYjsSocketOptions) {
  const canvasIdRef = useRef(canvasId)
  const socketRef = useRef<Socket | null>(null)

  const { docRef, localOriginRef, localMaxTimestampRef, sharedTypes, postits, placeCards, lines, textBoxes, zIndexOrder } = useYDocLifecycle({
    roomId,
    canvasId,
  })

  const handleSocketError = useCallback(
    (error: Error) => {
      reportError({
        error,
        code: 'SOCKET_ERROR',
        context: {
          namespace: 'canvas',
          roomId,
          canvasId,
        },
      })
    },
    [roomId, canvasId],
  )
  const { trackHighFreq, trackHighFreqRef } = useCanvasTelemetry({ roomId, canvasId })
  const { applyAwareness, clearCursors } = useCursorPresence()

  const cursorPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const cursorChatRef = useRef<{ chatActive: boolean; chatMessage: string }>({ chatActive: false, chatMessage: '' })

  const { undoManagerRef, canUndo, canRedo, undo, redo, stopCapturing, updateHistoryState } = useCanvasHistory({
    sharedTypes,
    localOriginRef,
  })

  const { getSocket, status } = useSocketClient({
    namespace: 'canvas',
    baseUrl: socketBaseUrl,
    onError: handleSocketError,
  })
  const isConnected = status === 'connected'

  useEffect(() => {
    canvasIdRef.current = canvasId
  }, [canvasId])

  useCanvasTransport({
    roomId,
    canvasId,
    status,
    getSocket,
    docRef,
    socketRef,
    trackHighFreq,
    applyAwareness,
    clearCursors,
  })

  const updateCursorThrottledRef = useRef<ThrottledFunction<[number, number]> | null>(null)

  useEffect(() => {
    const throttled = throttle((x: number, y: number) => {
      if (!socketRef.current?.connected) return
      cursorPositionRef.current = { x, y }
      const cursor = {
        x,
        y,
        name: userName,
        chatActive: cursorChatRef.current.chatActive,
        chatMessage: cursorChatRef.current.chatMessage,
      }
      const awarenessPayload: YjsAwarenessPayload = {
        canvasId: canvasIdRef.current,
        state: { cursor },
      }
      socketRef.current.emit('y:awareness', awarenessPayload)
      trackHighFreqRef.current('y:awareness:send')
    }, CURSOR_FREQUENCY)

    updateCursorThrottledRef.current = throttled

    return () => {
      throttled.cancel()
      if (updateCursorThrottledRef.current === throttled) {
        updateCursorThrottledRef.current = null
      }
    }
  }, [trackHighFreqRef, userName])

  const updateCursor = useCallback((x: number, y: number) => {
    updateCursorThrottledRef.current?.(x, y)
  }, [])

  const sendCursorChat = useCallback(
    (chatActive: boolean, chatMessage?: string) => {
      cursorChatRef.current = { chatActive, chatMessage: chatMessage ?? '' }
      const cursor = {
        x: cursorPositionRef.current.x,
        y: cursorPositionRef.current.y,
        name: userName,
        chatActive,
        chatMessage,
      }
      if (!socketRef.current?.connected) return

      const awarenessPayload: YjsAwarenessPayload = {
        canvasId: canvasIdRef.current,
        state: { cursor },
      }

      socketRef.current.emit('y:awareness', awarenessPayload)
      trackHighFreqRef.current('y:awareness:send')
    },
    [trackHighFreqRef, userName],
  )

  const { addPostIt, updatePostIt, addPlaceCard, updatePlaceCard, addLine, updateLine, addTextBox, updateTextBox, deleteCanvasItem, moveToTop } =
    useCanvasCommands({
      docRef,
      undoManagerRef,
      localOriginRef,
      localMaxTimestampRef,
      updateHistoryState,
    })

  return {
    isConnected,
    postits,
    placeCards,
    lines,
    textBoxes,
    zIndexOrder,
    canUndo,
    canRedo,
    updateCursor,
    sendCursorChat,
    undo,
    redo,
    stopCapturing,
    addPostIt,
    updatePostIt,
    addPlaceCard,
    updatePlaceCard,
    addLine,
    updateLine,
    addTextBox,
    updateTextBox,
    deleteCanvasItem,
    moveToTop,
  }
}
