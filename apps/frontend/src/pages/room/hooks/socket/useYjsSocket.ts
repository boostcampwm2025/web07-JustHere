import { useEffect, useRef, useCallback } from 'react'
import type { Socket } from 'socket.io-client'
import type { AwarenessState, CanvasAttachPayload, CanvasDetachPayload, YjsAwarenessPayload, YjsUpdatePayload } from '@/shared/types'
import { throttle, type ThrottledFunction } from '@/shared/utils'
import { useSocketClient } from '@/shared/hooks'
import { socketBaseUrl } from '@/shared/config/socket'
import { addSocketBreadcrumb, reportError } from '@/shared/utils'
import { CANVAS_EVENTS, CURSOR_FREQUENCY, YJS_EVENTS } from '@/pages/room/constants'
import { useCursorPresenceStore } from '@/pages/room/stores'
import { useYjsDoc, useYjsHistory, useYjsSocketEvents, useYjsTelemetry, useYjsCommands } from './yjs'

interface UseYjsSocketOptions {
  roomId: string
  canvasId: string
  serverUrl?: string
  userName: string
}

export function useYjsSocket({ roomId, canvasId, userName }: UseYjsSocketOptions) {
  const canvasIdRef = useRef(canvasId)
  const socketRef = useRef<Socket | null>(null)

  const applyAwareness = useCursorPresenceStore(state => state.applyAwareness)
  const clearCursors = useCursorPresenceStore(state => state.clearCursors)

  const { docRef, localOriginRef, localMaxTimestampRef, sharedTypes, postits, placeCards, lines, textBoxes, zIndexOrder } = useYjsDoc({
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
  const { trackHighFreq, trackHighFreqRef } = useYjsTelemetry({ roomId, canvasId })

  const cursorPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const cursorChatRef = useRef<{ chatActive: boolean; chatMessage: string }>({ chatActive: false, chatMessage: '' })

  const { undoManagerRef, canUndo, canRedo, undo, redo, stopCapturing, updateHistoryState } = useYjsHistory({
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
      targetSocket.emit(YJS_EVENTS.awareness, awarenessPayload)

      if (options?.track !== false) {
        trackHighFreqRef.current(YJS_EVENTS.awarenessSend)
      }
    },
    [trackHighFreqRef],
  )

  useYjsSocketEvents({
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
      socket.emit(CANVAS_EVENTS.attach, attachPayload)
      addSocketBreadcrumb(CANVAS_EVENTS.attach, { roomId, canvasId })
    }

    const handleUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin !== socket) {
        trackHighFreq(YJS_EVENTS.updateSend, update.byteLength)
        const updatePayload: YjsUpdatePayload = {
          canvasId,
          update: Array.from(update),
        }
        socket.emit(YJS_EVENTS.update, updatePayload)
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
      socket.emit(CANVAS_EVENTS.detach, detachPayload)
      clearCursors()

      doc.off('update', handleUpdate)
      socket.off('connect', handleConnect)
      if (socketRef.current === socket) {
        socketRef.current = null
      }
    }
  }, [roomId, canvasId, getSocket, clearCursors, status, docRef, socketRef, trackHighFreq, emitAwareness])

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
    useYjsCommands({
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
