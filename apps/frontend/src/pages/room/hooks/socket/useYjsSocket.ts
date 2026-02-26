import { useEffect, useRef, useState, useCallback } from 'react'
import type { Socket } from 'socket.io-client'
import * as Y from 'yjs'
import {
  type PostIt,
  type Line,
  type PlaceCard,
  type TextBox,
  type CanvasAttachPayload,
  type CanvasDetachPayload,
  type YjsUpdatePayload,
  type YjsAwarenessPayload,
  type CanvasAttachedPayload,
  type YjsUpdateBroadcast,
  type YjsAwarenessBroadcast,
  CANVAS_ITEM_TYPE,
  YJS_TYPE,
} from '@/shared/types'
import { throttle } from '@/shared/utils'
import { useSocketClient } from '@/shared/hooks'
import { socketBaseUrl } from '@/shared/config/socket'
import { addSocketBreadcrumb, reportError } from '@/shared/utils'
import { CAPTURE_FREQUENCY, CURSOR_FREQUENCY, SUMMARY_FREQUENCY } from '@/pages/room/constants'
import type { YjsItemType, YjsRank } from '@/pages/room/types'
import { resolveZIndexState } from '@/pages/room/utils'
import { canvasSyncHandlers } from './canvasSyncHandlers'
import { useRemoteCursors } from './useRemoteCursors'
import { useCanvasCommands } from './useCanvasCommands'

interface UseYjsSocketOptions {
  roomId: string
  canvasId: string
  serverUrl?: string
  userName: string
}

export function useYjsSocket({ roomId, canvasId, userName }: UseYjsSocketOptions) {
  const localMaxTimestampRef = useRef(0)
  const [postits, setPostits] = useState<PostIt[]>([])
  const [placeCards, setPlaceCards] = useState<PlaceCard[]>([])
  const [lines, setLines] = useState<Line[]>([])
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([])
  const [zIndexOrder, setZIndexOrder] = useState<Array<YjsItemType>>([])
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const socketRef = useRef<Socket | null>(null)
  const docRef = useRef<Y.Doc | null>(null)
  const undoManagerRef = useRef<Y.UndoManager | null>(null)
  const localOriginRef = useRef(Symbol('canvas-local'))
  const summaryRef = useRef<Map<string, { count: number; bytes: number }>>(new Map())
  const summaryTimerRef = useRef<number | null>(null)
  const trackHighFreqRef = useRef<(key: string, bytes?: number) => void>(() => {})
  const migrationExecutedRef = useRef(false)

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

  const flushSummary = useCallback(() => {
    if (summaryRef.current.size === 0) return

    summaryRef.current.forEach((stats, key) => {
      addSocketBreadcrumb(`${key}:summary`, {
        roomId,
        canvasId,
        count: stats.count,
        bytes: stats.bytes,
      })
    })

    summaryRef.current.clear()
    summaryTimerRef.current = null
  }, [roomId, canvasId])

  const trackHighFreq = useCallback(
    (key: string, bytes = 0) => {
      const current = summaryRef.current.get(key) ?? { count: 0, bytes: 0 }
      current.count += 1
      current.bytes += bytes
      summaryRef.current.set(key, current)

      if (summaryTimerRef.current == null) {
        summaryTimerRef.current = window.setTimeout(flushSummary, SUMMARY_FREQUENCY)
      }
    },
    [flushSummary],
  )

  useEffect(() => {
    trackHighFreqRef.current = trackHighFreq
  }, [trackHighFreq])

  const { cursors, updateCursorPosition, updateCursorChatState, applyRemoteAwareness, clearCursors } = useRemoteCursors({ userName })

  const updateHistoryState = useCallback(() => {
    const undoManager = undoManagerRef.current
    if (!undoManager) return
    setCanUndo(undoManager.canUndo())
    setCanRedo(undoManager.canRedo())
  }, [])

  const { getSocket, status } = useSocketClient({
    namespace: 'canvas',
    baseUrl: socketBaseUrl,
    onError: handleSocketError,
  })
  const isConnected = status === 'connected'

  useEffect(() => {
    migrationExecutedRef.current = false
    // Yjs 문서 초기화
    const doc = new Y.Doc()
    docRef.current = doc

    // Yjs SharedTypes 생성
    const yPostits = doc.getArray<Y.Map<unknown>>(YJS_TYPE[CANVAS_ITEM_TYPE.POST_IT])
    const yPlaceCards = doc.getArray<Y.Map<unknown>>(YJS_TYPE[CANVAS_ITEM_TYPE.PLACE_CARD])
    const yLines = doc.getArray<Y.Map<unknown>>(YJS_TYPE[CANVAS_ITEM_TYPE.LINE])
    const yTextBoxes = doc.getArray<Y.Map<unknown>>(YJS_TYPE[CANVAS_ITEM_TYPE.TEXT_BOX])
    const yZRankByKey = doc.getMap<YjsRank>(YJS_TYPE['Z_RANK_BY_KEY'])

    const undoManager = new Y.UndoManager([yPostits, yPlaceCards, yLines, yTextBoxes, yZRankByKey], {
      trackedOrigins: new Set([localOriginRef.current]),
      captureTimeout: CAPTURE_FREQUENCY,
    })
    undoManagerRef.current = undoManager

    const handleStackChange = () => {
      updateHistoryState()
    }

    undoManager.on('stack-item-added', handleStackChange)
    undoManager.on('stack-item-popped', handleStackChange)
    undoManager.on('stack-item-updated', handleStackChange)
    undoManager.on('stack-cleared', handleStackChange)
    handleStackChange()

    const { syncPostitsToState, syncPlaceCardsToState, syncLinesToState, syncTextBoxesToState, syncZIndexOrderToState } = canvasSyncHandlers({
      localMaxTimestampRef,
      setPostits,
      setPlaceCards,
      setLines,
      setTextBoxes,
      setZIndexOrder,
      resolveZIndexState,
    })({
      yPostits,
      yPlaceCards,
      yLines,
      yTextBoxes,
      yZRankByKey,
    })

    yPostits.observeDeep(syncPostitsToState)
    yPlaceCards.observeDeep(syncPlaceCardsToState)
    yLines.observeDeep(syncLinesToState)
    yTextBoxes.observeDeep(syncTextBoxesToState)
    yZRankByKey.observe(syncZIndexOrderToState)

    syncPostitsToState()
    syncPlaceCardsToState()
    syncLinesToState()
    syncTextBoxesToState()
    syncZIndexOrderToState()

    return () => {
      yPostits.unobserveDeep(syncPostitsToState)
      yPlaceCards.unobserveDeep(syncPlaceCardsToState)
      yLines.unobserveDeep(syncLinesToState)
      yTextBoxes.unobserveDeep(syncTextBoxesToState)
      yZRankByKey.unobserve(syncZIndexOrderToState)
      undoManager.off('stack-item-added', handleStackChange)
      undoManager.off('stack-item-popped', handleStackChange)
      undoManager.off('stack-item-updated', handleStackChange)
      undoManager.off('stack-cleared', handleStackChange)
      undoManager.destroy()
      undoManagerRef.current = null
      setCanUndo(false)
      setCanRedo(false)
      doc.destroy()
    }
  }, [roomId, canvasId, updateHistoryState])

  useEffect(() => {
    return () => {
      flushSummary()
      if (summaryTimerRef.current != null) {
        window.clearTimeout(summaryTimerRef.current)
        summaryTimerRef.current = null
      }
    }
  }, [roomId, canvasId, flushSummary])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const doc = docRef.current
    if (!doc) return

    socketRef.current = socket

    const handleConnect = () => {
      // 캔버스 참여
      const attachPayload: CanvasAttachPayload = { roomId, canvasId }
      socket.emit('canvas:attach', attachPayload)
      addSocketBreadcrumb('canvas:attach', { roomId, canvasId })
    }

    const handleCanvasAttached = (payload: CanvasAttachedPayload) => {
      if (!payload.update) return

      const updateArray = new Uint8Array(payload.update)
      // origin을 socket으로 명시하여 재전송 방지
      Y.applyUpdate(doc, updateArray, socket)
      addSocketBreadcrumb('canvas:attached', { roomId, canvasId, bytes: updateArray.byteLength })
    }

    const handleCanvasDetached = () => {
      // TODO: 카테고리 나갔을 때 처리 로직
      addSocketBreadcrumb('canvas:detached', { roomId, canvasId })
    }

    const handleYjsUpdate = (payload: YjsUpdateBroadcast) => {
      const updateArray = new Uint8Array(payload.update)
      // origin을 socket으로 명시하여 재전송 방지
      Y.applyUpdate(doc, updateArray, socket)
      trackHighFreq('y:update:recv', updateArray.byteLength)
    }

    const handleAwareness = (payload: YjsAwarenessBroadcast) => {
      trackHighFreq('y:awareness:recv')
      applyRemoteAwareness(payload)
    }

    // Yjs 문서 변경 시 서버로 전송
    const updateHandler = (update: Uint8Array, origin: unknown) => {
      // 로컬 변경만 전송 (원격에서 받은 업데이트는 재전송하지 않음)
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
    socket.on('canvas:attached', handleCanvasAttached)
    socket.on('canvas:detached', handleCanvasDetached)
    socket.on('y:update', handleYjsUpdate)
    socket.on('y:awareness', handleAwareness)
    doc.on('update', updateHandler)

    if (socket.connected) {
      handleConnect()
    }

    return () => {
      // 캔버스 변경 시 커서 사라짐 이벤트 브로드캐스트
      if (socket.connected) {
        const awarenessPayload: YjsAwarenessPayload = {
          canvasId,
          state: {},
        }
        socket.emit('y:awareness', awarenessPayload)
      }

      // 캔버스 나가기
      const detachPayload: CanvasDetachPayload = { canvasId }
      socket.emit('canvas:detach', detachPayload)

      // UI에서 타 사람들의 커서 정리
      clearCursors()

      doc.off('update', updateHandler)
      socket.off('connect', handleConnect)
      socket.off('canvas:attached', handleCanvasAttached)
      socket.off('canvas:detached', handleCanvasDetached)
      socket.off('y:update', handleYjsUpdate)
      socket.off('y:awareness', handleAwareness)
      socketRef.current = null
    }
  }, [roomId, canvasId, getSocket, status, trackHighFreq, applyRemoteAwareness, clearCursors])

  const updateCursorThrottled = useRef(
    throttle((x: number, y: number) => {
      if (!socketRef.current?.connected) return
      const cursor = updateCursorPosition(x, y)
      const awarenessPayload: YjsAwarenessPayload = {
        canvasId,
        state: { cursor },
      }
      socketRef.current.emit('y:awareness', awarenessPayload)
      trackHighFreqRef.current('y:awareness:send')
    }, CURSOR_FREQUENCY),
  ).current

  const updateCursor = useCallback(
    (x: number, y: number) => {
      updateCursorThrottled(x, y)
    },
    [updateCursorThrottled],
  )

  const sendCursorChat = useCallback(
    (chatActive: boolean, chatMessage?: string) => {
      const cursor = updateCursorChatState(chatActive, chatMessage)
      if (!socketRef.current?.connected) return

      const awarenessPayload: YjsAwarenessPayload = {
        canvasId,
        state: { cursor },
      }

      socketRef.current.emit('y:awareness', awarenessPayload)
      trackHighFreqRef.current('y:awareness:send')
    },
    [canvasId, updateCursorChatState],
  )

  const undo = useCallback(() => {
    const undoManager = undoManagerRef.current
    if (!undoManager) return
    undoManager.undo()
    updateHistoryState()
  }, [updateHistoryState])

  const redo = useCallback(() => {
    const undoManager = undoManagerRef.current
    if (!undoManager) return
    undoManager.redo()
    updateHistoryState()
  }, [updateHistoryState])

  const stopCapturing = useCallback(() => {
    const undoManager = undoManagerRef.current
    if (!undoManager) return
    undoManager.stopCapturing()
    updateHistoryState()
  }, [updateHistoryState])

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
