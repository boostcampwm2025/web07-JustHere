import { useEffect, useRef, useCallback } from 'react'
import type { Socket } from 'socket.io-client'
import type { YjsAwarenessPayload } from '@/shared/types'
import { throttle, type ThrottledFunction } from '@/shared/utils'
import { useSocketClient } from '@/shared/hooks'
import { socketBaseUrl } from '@/shared/config/socket'
import { reportError } from '@/shared/utils'
import { CURSOR_FREQUENCY } from '@/pages/room/constants'
import { useRemoteCursors } from './useRemoteCursors'
import { useCanvasCommands } from './useCanvasCommands'
import { useCanvasTelemetry } from './useCanvasTelemetry'
import { useYDocLifecycle } from './useYDocLifecycle'
import { useCanvasHistory } from './useCanvasHistory'
import { useCanvasTransport } from './useCanvasTransport'

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

  const { cursors, updateCursorPosition, updateCursorChatState, applyRemoteAwareness, clearCursors } = useRemoteCursors({ userName })
  const updateCursorPositionRef = useRef(updateCursorPosition)
  const updateCursorChatStateRef = useRef(updateCursorChatState)

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

  useEffect(() => {
    updateCursorPositionRef.current = updateCursorPosition
  }, [updateCursorPosition])

  useEffect(() => {
    updateCursorChatStateRef.current = updateCursorChatState
  }, [updateCursorChatState])

  useCanvasTransport({
    roomId,
    canvasId,
    status,
    getSocket,
    docRef,
    socketRef,
    trackHighFreq,
    applyRemoteAwareness,
    clearCursors,
  })

  const updateCursorThrottledRef = useRef<ThrottledFunction<[number, number]> | null>(null)

  useEffect(() => {
    const throttled = throttle((x: number, y: number) => {
      if (!socketRef.current?.connected) return
      const cursor = updateCursorPositionRef.current(x, y)
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
  }, [trackHighFreqRef])

  const updateCursor = useCallback((x: number, y: number) => {
    updateCursorThrottledRef.current?.(x, y)
  }, [])

  const sendCursorChat = useCallback(
    (chatActive: boolean, chatMessage?: string) => {
      const cursor = updateCursorChatStateRef.current(chatActive, chatMessage)
      if (!socketRef.current?.connected) return

      const awarenessPayload: YjsAwarenessPayload = {
        canvasId: canvasIdRef.current,
        state: { cursor },
      }

      socketRef.current.emit('y:awareness', awarenessPayload)
      trackHighFreqRef.current('y:awareness:send')
    },
    [trackHighFreqRef],
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
    cursors,
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
