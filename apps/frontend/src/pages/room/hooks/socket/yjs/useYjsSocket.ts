import { useEffect, useRef, useCallback } from 'react'
import type { Socket } from 'socket.io-client'
import type { AwarenessState, CanvasAttachPayload, CanvasDetachPayload, YjsAwarenessPayload, YjsUpdatePayload } from '@/shared/types'
import { throttle, type ThrottledFunction } from '@/shared/utils'
import { useSocketClient } from '@/shared/hooks'
import { socketBaseUrl } from '@/shared/config/socket'
import { addSocketBreadcrumb, reportError } from '@/shared/utils'
import { CURSOR_FREQUENCY } from '@/pages/room/constants'
import { useCursorPresence } from '@/pages/room/hooks'
import { useCanvasCommands } from './useCanvasCommands'
import { useCanvasHistory } from './useCanvasHistory'
import { useCanvasSocketEvents } from './useCanvasSocketEvents'
import { useCanvasTelemetry } from './useCanvasTelemetry'
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

  const emitAwareness = useCallback(
    (
      state: AwarenessState,
      options?: {
        socket?: Socket | null
        canvasId?: string
        track?: boolean
      },
    ) => {
      const targetSocket = options?.socket ?? socketRef.current
      if (!targetSocket?.connected) return

      const awarenessPayload: YjsAwarenessPayload = {
        canvasId: options?.canvasId ?? canvasIdRef.current,
        state,
      }
      targetSocket.emit('y:awareness', awarenessPayload)

      if (options?.track !== false) {
        trackHighFreqRef.current('y:awareness:send')
      }
    },
    [trackHighFreqRef],
  )

  useCanvasSocketEvents({
    resolveSocket: getSocket,
    enabled: status !== 'disconnected',
    roomId,
    canvasId,
    docRef,
    applyAwareness,
    trackHighFreq,
  })

  const updateCursorThrottledRef = useRef<ThrottledFunction<[number, number]> | null>(null)

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const doc = docRef.current
    if (!doc) return

    socketRef.current = socket

    const handleConnect = () => {
      const attachPayload: CanvasAttachPayload = { roomId, canvasId }
      socket.emit('canvas:attach', attachPayload)
      addSocketBreadcrumb('canvas:attach', { roomId, canvasId })
    }

    const handleUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin !== socket) {
        trackHighFreq('y:update:send', update.byteLength)
        const updatePayload: YjsUpdatePayload = {
          canvasId,
          update: Array.from(update),
        }
        socket.emit('y:update', updatePayload)
      }
    }

    socket.on('connect', handleConnect)
    doc.on('update', handleUpdate)

    if (socket.connected) {
      handleConnect()
    }

    return () => {
      emitAwareness({}, { socket, canvasId, track: false })

      const detachPayload: CanvasDetachPayload = { canvasId }
      socket.emit('canvas:detach', detachPayload)
      clearCursors()

      doc.off('update', handleUpdate)
      socket.off('connect', handleConnect)
      if (socketRef.current === socket) {
        socketRef.current = null
      }
    }
  }, [roomId, canvasId, getSocket, status, docRef, socketRef, trackHighFreq, clearCursors, emitAwareness])

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
      emitAwareness({ cursor })
    }, CURSOR_FREQUENCY)

    updateCursorThrottledRef.current = throttled

    return () => {
      throttled.cancel()
      if (updateCursorThrottledRef.current === throttled) {
        updateCursorThrottledRef.current = null
      }
    }
  }, [emitAwareness, userName])

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

      emitAwareness({ cursor })
    },
    [emitAwareness, userName],
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
