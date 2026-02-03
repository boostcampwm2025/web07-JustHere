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
  CursorInfoWithId,
} from '@/shared/types'
import { throttle } from '@/shared/utils'
import { useSocketClient } from '@/shared/hooks'
import { socketBaseUrl } from '@/shared/config/socket'
import { addSocketBreadcrumb, reportError } from '@/shared/utils'
import type { CanvasItemType } from '@/shared/types'
import { CAPTURE_FREQUENCY, CURSOR_FREQUENCY, PLACE_CARD_HEIGHT, PLACE_CARD_WIDTH, SUMMARY_FREQUENCY } from '@/pages/room/constants'
import type { YjsItemType, YjsRank } from '@/pages/room/types'
import { makeKey, parseKey } from '@/pages/room/utils'

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
  const [cursors, setCursors] = useState<Map<string, CursorInfoWithId>>(new Map())
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
  // 현재 커서 위치 저장 (커서챗 전송 시 사용)
  const cursorPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  // 현재 커서챗 상태 저장 (커서 이동 시에도 커서챗 정보 유지)
  const cursorChatRef = useRef<{ chatActive: boolean; chatMessage: string }>({ chatActive: false, chatMessage: '' })
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

    // Yjs 변경사항을 React state에 반영하는 함수
    const syncPostitsToState = () => {
      const items: PostIt[] = yPostits.toArray().map(yMap => ({
        id: yMap.get('id') as string,
        x: yMap.get('x') as number,
        y: yMap.get('y') as number,
        width: yMap.get('width') as number,
        height: yMap.get('height') as number,
        scale: yMap.get('scale') as number,
        fill: yMap.get('fill') as string,
        text: yMap.get('text') as string,
        authorName: yMap.get('authorName') as string,
      }))
      setPostits(items)
    }

    const syncPlaceCardsToState = () => {
      const items: PlaceCard[] = yPlaceCards.toArray().map(yMap => ({
        id: yMap.get('id') as string,
        placeId: yMap.get('placeId') as string,
        name: yMap.get('name') as string,
        address: yMap.get('address') as string,
        x: yMap.get('x') as number,
        y: yMap.get('y') as number,
        width: (yMap.get('width') as number | undefined) ?? PLACE_CARD_WIDTH,
        height: (yMap.get('height') as number | undefined) ?? PLACE_CARD_HEIGHT,
        scale: yMap.get('scale') as number,
        createdAt: yMap.get('createdAt') as string,
        image: (yMap.get('image') as string | null | undefined) ?? null,
        category: (yMap.get('category') as string | undefined) ?? '',
        rating: yMap.get('rating') as number | undefined,
        userRatingCount: yMap.get('userRatingCount') as number | undefined,
      }))
      setPlaceCards(items)
    }

    const syncLinesToState = () => {
      const items: Line[] = yLines.toArray().map(yMap => ({
        id: yMap.get('id') as string,
        points: yMap.get('points') as number[],
        stroke: yMap.get('stroke') as string,
        strokeWidth: yMap.get('strokeWidth') as number,
        tension: yMap.get('tension') as number,
        lineCap: yMap.get('lineCap') as 'round' | 'butt' | 'square',
        lineJoin: yMap.get('lineJoin') as 'round' | 'bevel' | 'miter',
        tool: yMap.get('tool') as 'pen',
      }))
      setLines(items)
    }

    const syncTextBoxesToState = () => {
      const items: TextBox[] = yTextBoxes.toArray().map(yMap => ({
        id: yMap.get('id') as string,
        x: yMap.get('x') as number,
        y: yMap.get('y') as number,
        width: yMap.get('width') as number,
        height: yMap.get('height') as number,
        scale: yMap.get('scale') as number,
        text: yMap.get('text') as string,
        authorName: yMap.get('authorName') as string,
      }))
      setTextBoxes(items)
    }

    const syncZIndexOrderToState = () => {
      const entries: Array<{ key: string; rank: YjsRank; parsed: YjsItemType | null }> = []
      let maxTimestamp = localMaxTimestampRef.current

      yZRankByKey.forEach((rank, key) => {
        if (rank?.timestamp != null) maxTimestamp = Math.max(maxTimestamp, rank.timestamp)
        const parsed = parseKey(key)
        entries.push({ key, rank: rank ?? { timestamp: 0, clientId: 0 }, parsed })
      })
      localMaxTimestampRef.current = maxTimestamp

      entries.sort((a, b) => {
        if (a.rank.timestamp !== b.rank.timestamp) return a.rank.timestamp - b.rank.timestamp
        return a.rank.clientId - b.rank.clientId
      })

      const items: Array<YjsItemType> = []
      for (const entry of entries) {
        if (entry.parsed) items.push(entry.parsed)
      }
      setZIndexOrder(items)
    }

    // Yjs 변경 감지 리스너
    // observe: Y.Array의 추가/삭제만 감지 (드래그 위치 변경 감지를 못함)
    // observeDeep: 모든 변경 감지 (배열 구조 변경 + 내부 Y.Map 속성 변경)
    yPostits.observeDeep(syncPostitsToState)
    yPlaceCards.observeDeep(syncPlaceCardsToState)
    yLines.observeDeep(syncLinesToState)
    yTextBoxes.observeDeep(syncTextBoxesToState)
    yZRankByKey.observe(syncZIndexOrderToState)

    // 초기 동기화
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

      // 커서가 없으면 제거 (사용자가 나간 경우)
      setCursors(prev => {
        const next = new Map(prev)
        next.delete(payload.socketId)
        return next
      })
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
      setCursors(new Map())

      doc.off('update', updateHandler)
      socket.off('connect', handleConnect)
      socket.off('canvas:attached', handleCanvasAttached)
      socket.off('canvas:detached', handleCanvasDetached)
      socket.off('y:update', handleYjsUpdate)
      socket.off('y:awareness', handleAwareness)
      socketRef.current = null
    }
  }, [roomId, canvasId, getSocket, status, trackHighFreq])

  // 커서 위치 업데이트 함수 (쓰로틀링 적용: 100ms마다 최대 1회)
  // 커서 이동 시에도 현재 커서챗 상태를 함께 전송
  const updateCursorThrottled = useRef(
    throttle(
      (
        canvasId: string,
        socketRef: React.MutableRefObject<Socket | null>,
        x: number,
        y: number,
        name: string,
        cursorChatRef: React.MutableRefObject<{ chatActive: boolean; chatMessage: string }>,
      ) => {
        if (socketRef.current?.connected) {
          const chatState = cursorChatRef.current
          const awarenessPayload: YjsAwarenessPayload = {
            canvasId,
            state: {
              cursor: {
                x,
                y,
                name,
                chatActive: chatState.chatActive,
                chatMessage: chatState.chatMessage,
              },
            },
          }
          socketRef.current.emit('y:awareness', awarenessPayload)
          trackHighFreqRef.current('y:awareness:send')
        }
      },
      CURSOR_FREQUENCY,
    ),
  ).current

  const updateCursor = useCallback(
    (x: number, y: number) => {
      // 현재 위치 저장 (커서챗 전송 시 사용)
      cursorPositionRef.current = { x, y }
      updateCursorThrottled(canvasId, socketRef, x, y, userName, cursorChatRef)
    },
    [canvasId, updateCursorThrottled, userName],
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

  // 커서챗 전송 함수 (쓰로틀링 없이 즉시 전송)
  const sendCursorChat = useCallback(
    (chatActive: boolean, chatMessage?: string) => {
      // 커서챗 상태 저장 (커서 이동 시에도 상태 유지를 위해)
      cursorChatRef.current = { chatActive, chatMessage: chatMessage ?? '' }

      if (!socketRef.current?.connected) return

      const { x, y } = cursorPositionRef.current
      const awarenessPayload: YjsAwarenessPayload = {
        canvasId,
        state: {
          cursor: { x, y, name: userName, chatActive, chatMessage },
        },
      }
      socketRef.current.emit('y:awareness', awarenessPayload)
      trackHighFreqRef.current('y:awareness:send')
    },
    [canvasId, userName],
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

    const zIndexMap = new Y.Map()
    zIndexMap.set('type', 'postit')
    zIndexMap.set('id', postit.id)

    doc.transact(() => {
      yPostits.push([yMap])
      const nextTimestamp = localMaxTimestampRef.current + 1
      localMaxTimestampRef.current = nextTimestamp
      yZRankByKey.set(makeKey('postit', postit.id), { timestamp: nextTimestamp, clientId: doc.clientID })
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

    const zIndexMap = new Y.Map()
    zIndexMap.set('type', 'placeCard')
    zIndexMap.set('id', card.id)

    doc.transact(() => {
      yPlaceCards.push([yMap])
      const nextTimestamp = localMaxTimestampRef.current + 1
      localMaxTimestampRef.current = nextTimestamp
      yZRankByKey.set(makeKey('placeCard', card.id), { timestamp: nextTimestamp, clientId: doc.clientID })
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

    const zIndexMap = new Y.Map()
    zIndexMap.set('type', 'line')
    zIndexMap.set('id', line.id)

    doc.transact(() => {
      yLines.push([yMap])
      const nextTimestamp = localMaxTimestampRef.current + 1
      localMaxTimestampRef.current = nextTimestamp
      yZRankByKey.set(makeKey('line', line.id), { timestamp: nextTimestamp, clientId: doc.clientID })
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

    const zIndexMap = new Y.Map()
    zIndexMap.set('type', 'textBox')
    zIndexMap.set('id', textBox.id)

    doc.transact(() => {
      yTextBoxes.push([yMap])
      const nextTimestamp = localMaxTimestampRef.current + 1
      localMaxTimestampRef.current = nextTimestamp
      yZRankByKey.set(makeKey('textBox', textBox.id), { timestamp: nextTimestamp, clientId: doc.clientID })
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
        const nextTimestamp = localMaxTimestampRef.current + 1

        // timestamp가 max이고
        // 같은 timestamp를 가진 아이템 중 clientId가 가장 작은 아이템인지 확인
        if (current?.timestamp === localMaxTimestampRef.current) {
          let minClientId = current.clientId
          yZRankByKey.forEach(rank => {
            if (rank?.timestamp === localMaxTimestampRef.current && rank.clientId < minClientId) {
              minClientId = rank.clientId
            }
          })

          if (current.clientId === minClientId) return
        }

        localMaxTimestampRef.current = nextTimestamp
        yZRankByKey.set(key, { timestamp: nextTimestamp, clientId: doc.clientID })
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
