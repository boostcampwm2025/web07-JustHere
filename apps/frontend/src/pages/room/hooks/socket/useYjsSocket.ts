import { useEffect, useRef, useState, useCallback } from 'react'
import type { Socket } from 'socket.io-client'
import * as Y from 'yjs'
import type {
  PostIt,
  Line,
  PlaceCard,
  TextBox,
  CanvasAttachPayload,
  CanvasDetachPayload,
  YjsUpdatePayload,
  YjsAwarenessPayload,
  CanvasAttachedPayload,
  YjsUpdateBroadcast,
  YjsAwarenessBroadcast,
} from '@/shared/types'
import { throttle } from '@/shared/utils'
import { useSocketClient } from '@/shared/hooks'
import { socketBaseUrl } from '@/shared/config/socket'
import { addSocketBreadcrumb, reportError } from '@/shared/utils'
import type { CanvasItemType } from '@/shared/types'
import { CAPTURE_FREQUENCY, CURSOR_FREQUENCY, PLACE_CARD_HEIGHT, PLACE_CARD_WIDTH, SUMMARY_FREQUENCY } from '@/pages/room/constants'
import type { YjsItemType, YjsRank } from '@/pages/room/types'
import { makeKey, assignNextRank, resolveZIndexState, shouldSkipMoveToTop } from '@/pages/room/utils'
import { canvasSyncHandlers } from './canvasSyncHandlers'
import { useRemoteCursors } from './useRemoteCursors'

interface UseYjsSocketOptions {
  roomId: string
  canvasId: string
  serverUrl?: string
  userName: string
}

const typeToArrayName: Record<CanvasItemType, string> = {
  postit: 'postits',
  line: 'lines',
  placeCard: 'placeCards',
  textBox: 'textBoxes',
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
    const yPostits = doc.getArray<Y.Map<unknown>>('postits')
    const yPlaceCards = doc.getArray<Y.Map<unknown>>('placeCards')
    const yLines = doc.getArray<Y.Map<unknown>>('lines')
    const yTextBoxes = doc.getArray<Y.Map<unknown>>('textBoxes')
    const yZRankByKey = doc.getMap<YjsRank>('zRankByKey')

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

  // 공통 업데이트 헬퍼 함수
  const updateItem = useCallback((arrayName: string, id: string, updates: Record<string, unknown>) => {
    const doc = docRef.current
    if (!doc) return

    const yArray = doc.getArray<Y.Map<unknown>>(arrayName)

    const idToIndexMap = new Map<string, number>()
    yArray.forEach((yMap, index) => {
      const itemId = yMap.get('id') as string
      if (itemId) {
        idToIndexMap.set(itemId, index)
      }
    })

    const index = idToIndexMap.get(id)
    if (index === undefined) return

    doc.transact(() => {
      const yMap = yArray.get(index)
      Object.entries(updates).forEach(([key, value]) => {
        yMap.set(key, value)
      })
    }, localOriginRef.current)
  }, [])

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

  // 포스트잇 추가 함수
  const addPostIt = (postit: PostIt) => {
    const doc = docRef.current
    if (!doc) return

    const yPostits = doc.getArray<Y.Map<unknown>>('postits')
    const yZRankByKey = doc.getMap<YjsRank>('zRankByKey')
    const yMap = new Y.Map()
    yMap.set('id', postit.id)
    yMap.set('x', postit.x)
    yMap.set('y', postit.y)
    yMap.set('width', postit.width)
    yMap.set('height', postit.height)
    yMap.set('scale', postit.scale)
    yMap.set('fill', postit.fill)
    yMap.set('text', postit.text)
    yMap.set('authorName', postit.authorName)

    doc.transact(() => {
      yPostits.push([yMap])
      localMaxTimestampRef.current = assignNextRank(yZRankByKey, makeKey('postit', postit.id), localMaxTimestampRef.current, doc.clientID)
    }, localOriginRef.current)
  }

  // 포스트잇 업데이트 함수 (위치, 텍스트 등)
  const updatePostIt = (id: string, updates: Partial<Omit<PostIt, 'id'>>) => {
    updateItem('postits', id, updates)
  }

  // 장소 카드 추가 함수
  const addPlaceCard = (card: PlaceCard) => {
    const doc = docRef.current
    if (!doc) return

    const yPlaceCards = doc.getArray<Y.Map<unknown>>('placeCards')
    const yZRankByKey = doc.getMap<YjsRank>('zRankByKey')
    const yMap = new Y.Map()
    yMap.set('id', card.id)
    yMap.set('placeId', card.placeId)
    yMap.set('name', card.name)
    yMap.set('address', card.address)
    yMap.set('x', card.x)
    yMap.set('y', card.y)
    yMap.set('width', card.width ?? PLACE_CARD_WIDTH)
    yMap.set('height', card.height ?? PLACE_CARD_HEIGHT)
    yMap.set('scale', card.scale ?? 1)
    yMap.set('createdAt', card.createdAt)
    yMap.set('image', card.image ?? null)
    yMap.set('category', card.category ?? '')
    if (card.rating !== undefined) yMap.set('rating', card.rating)
    if (card.userRatingCount !== undefined) yMap.set('userRatingCount', card.userRatingCount)

    doc.transact(() => {
      yPlaceCards.push([yMap])
      localMaxTimestampRef.current = assignNextRank(yZRankByKey, makeKey('placeCard', card.id), localMaxTimestampRef.current, doc.clientID)
    }, localOriginRef.current)
  }

  // 장소 카드 업데이트 함수
  const updatePlaceCard = (id: string, updates: Partial<Omit<PlaceCard, 'id'>>) => {
    updateItem('placeCards', id, updates)
  }

  // 선 추가 함수
  const addLine = (line: Line) => {
    const doc = docRef.current
    if (!doc) return

    const yLines = doc.getArray<Y.Map<unknown>>('lines')
    const yZRankByKey = doc.getMap<YjsRank>('zRankByKey')
    const yMap = new Y.Map()
    yMap.set('id', line.id)
    yMap.set('points', line.points)
    yMap.set('stroke', line.stroke)
    yMap.set('strokeWidth', line.strokeWidth)
    yMap.set('tension', line.tension)
    yMap.set('lineCap', line.lineCap)
    yMap.set('lineJoin', line.lineJoin)
    yMap.set('tool', line.tool)

    doc.transact(() => {
      yLines.push([yMap])
      localMaxTimestampRef.current = assignNextRank(yZRankByKey, makeKey('line', line.id), localMaxTimestampRef.current, doc.clientID)
    }, localOriginRef.current)
  }

  // 선 업데이트 함수 (주로 points 배열 업데이트)
  const updateLine = (id: string, updates: Partial<Omit<Line, 'id'>>) => {
    updateItem('lines', id, updates)
  }

  const deleteCanvasItem = (type: CanvasItemType, id: string) => {
    const doc = docRef.current
    if (!doc) return

    const arrayName = typeToArrayName[type]
    const yArray = doc.getArray<Y.Map<unknown>>(arrayName)
    const yZRankByKey = doc.getMap<YjsRank>('zRankByKey')

    const idToIndexMap = new Map<string, number>()
    yArray.forEach((yMap, index) => {
      const itemId = yMap.get('id') as string
      if (itemId) {
        idToIndexMap.set(itemId, index)
      }
    })

    const index = idToIndexMap.get(id)
    if (index === undefined) return

    doc.transact(() => {
      yArray.delete(index, 1)
      yZRankByKey.delete(makeKey(type, id))
    }, localOriginRef.current)
  }

  // 텍스트박스 추가 함수
  const addTextBox = (textBox: TextBox) => {
    const doc = docRef.current
    if (!doc) return

    const yTextBoxes = doc.getArray<Y.Map<unknown>>('textBoxes')
    const yZRankByKey = doc.getMap<YjsRank>('zRankByKey')
    const yMap = new Y.Map()

    Object.entries(textBox).forEach(([key, value]) => {
      yMap.set(key, value)
    })

    doc.transact(() => {
      yTextBoxes.push([yMap])
      localMaxTimestampRef.current = assignNextRank(yZRankByKey, makeKey('textBox', textBox.id), localMaxTimestampRef.current, doc.clientID)
    }, localOriginRef.current)
  }

  // 텍스트박스 업데이트 함수
  const updateTextBox = (id: string, updates: Partial<Omit<TextBox, 'id'>>) => {
    updateItem('textBoxes', id, updates)
  }

  // 요소를 배열의 맨 위로 이동하는 함수
  const moveToTop = useCallback(
    (type: CanvasItemType, id: string) => {
      const doc = docRef.current
      if (!doc) return

      const yZRankByKey = doc.getMap<YjsRank>('zRankByKey')
      const key = makeKey(type, id)

      doc.transact(() => {
        const current = yZRankByKey.get(key)
        if (shouldSkipMoveToTop(yZRankByKey, current, localMaxTimestampRef.current)) {
          return
        }
        localMaxTimestampRef.current = assignNextRank(yZRankByKey, key, localMaxTimestampRef.current, doc.clientID)
      }, localOriginRef.current)

      const undoManager = undoManagerRef.current
      if (undoManager) {
        undoManager.stopCapturing()
        updateHistoryState()
      }
    },
    [updateHistoryState],
  )

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
