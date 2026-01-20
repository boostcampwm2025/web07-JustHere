import { useEffect, useRef, useState, useCallback } from 'react'
import type { Socket } from 'socket.io-client'
import * as Y from 'yjs'
import type {
  CanvasAttachPayload,
  CanvasDetachPayload,
  YjsUpdatePayload,
  YjsAwarenessPayload,
  CanvasAttachedPayload,
  YjsUpdateBroadcast,
  YjsAwarenessBroadcast,
  CursorInfoWithId,
} from '@/types/yjs.types'
import type { PostIt, Line } from '@/types/canvas.types'
import { throttle } from '@/utils/throttle'
import { useSocketClient } from '@/hooks/useSocketClient'
import { socketBaseUrl } from '@/config/socket'

interface UseYjsSocketOptions {
  roomId: string
  canvasId: string
  serverUrl?: string
}

export function useYjsSocket({ roomId, canvasId }: UseYjsSocketOptions) {
  const [cursors, setCursors] = useState<Map<string, CursorInfoWithId>>(new Map())
  const [postits, setPostits] = useState<PostIt[]>([])
  const [lines, setLines] = useState<Line[]>([])
  const [socketId, setSocketId] = useState('unknown')

  const socketRef = useRef<Socket | null>(null)
  const docRef = useRef<Y.Doc | null>(null)
  // 현재 커서 위치 저장 (커서챗 전송 시 사용)
  const cursorPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  // 현재 커서챗 상태 저장 (커서 이동 시에도 커서챗 정보 유지)
  const cursorChatRef = useRef<{ chatActive: boolean; chatMessage: string }>({ chatActive: false, chatMessage: '' })
  const handleSocketError = useCallback((error: Error) => {
    console.error('[canvas] socket error:', error)
  }, [])

  const { getSocket, status } = useSocketClient({
    namespace: 'canvas',
    baseUrl: socketBaseUrl,
    onError: handleSocketError,
  })
  const isConnected = status === 'connected'

  useEffect(() => {
    // Yjs 문서 초기화
    const doc = new Y.Doc()
    docRef.current = doc

    // Yjs SharedTypes 생성
    const yPostits = doc.getArray<Y.Map<unknown>>('postits')
    const yLines = doc.getArray<Y.Map<unknown>>('lines')

    // Yjs 변경사항을 React state에 반영하는 함수
    const syncPostitsToState = () => {
      const items: PostIt[] = yPostits.toArray().map(yMap => ({
        id: yMap.get('id') as string,
        x: yMap.get('x') as number,
        y: yMap.get('y') as number,
        width: yMap.get('width') as number,
        height: yMap.get('height') as number,
        fill: yMap.get('fill') as string,
        text: yMap.get('text') as string,
        authorName: yMap.get('authorName') as string,
      }))
      setPostits(items)
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

    // Yjs 변경 감지 리스너
    // observe: Y.Array의 추가/삭제만 감지 (드래그 위치 변경 감지를 못함)
    // observeDeep: 모든 변경 감지 (배열 구조 변경 + 내부 Y.Map 속성 변경)
    yPostits.observeDeep(syncPostitsToState)
    yLines.observeDeep(syncLinesToState)

    // 초기 동기화
    syncPostitsToState()
    syncLinesToState()

    return () => {
      yPostits.unobserveDeep(syncPostitsToState)
      yLines.unobserveDeep(syncLinesToState)
      doc.destroy()
    }
  }, [roomId, canvasId])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const doc = docRef.current
    if (!doc) return

    socketRef.current = socket

    const handleConnect = () => {
      setSocketId(socket.id || 'unknown')

      // 캔버스 참여
      const attachPayload: CanvasAttachPayload = { roomId, canvasId }
      socket.emit('canvas:attach', attachPayload)
    }

    const handleCanvasAttached = (payload: CanvasAttachedPayload) => {
      if (!payload.update) return

      const updateArray = new Uint8Array(payload.update)
      // origin을 socket으로 명시하여 재전송 방지
      Y.applyUpdate(doc, updateArray, socket)
    }

    const handleCanvasDetached = () => {
      // TODO: 카테고리 나갔을 때 처리 로직
    }

    const handleYjsUpdate = (payload: YjsUpdateBroadcast) => {
      const updateArray = new Uint8Array(payload.update)
      // origin을 socket으로 명시하여 재전송 방지
      Y.applyUpdate(doc, updateArray, socket)
    }

    const handleAwareness = (payload: YjsAwarenessBroadcast) => {
      const cursor = payload.state.cursor
      if (cursor) {
        setCursors(prev => {
          const next = new Map(prev)
          next.set(payload.socketId, {
            x: cursor.x,
            y: cursor.y,
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

      doc.off('update', updateHandler)
      socket.off('connect', handleConnect)
      socket.off('canvas:attached', handleCanvasAttached)
      socket.off('canvas:detached', handleCanvasDetached)
      socket.off('y:update', handleYjsUpdate)
      socket.off('y:awareness', handleAwareness)
      socketRef.current = null
    }
  }, [roomId, canvasId, getSocket, status])

  // 커서 위치 업데이트 함수 (쓰로틀링 적용: 100ms마다 최대 1회)
  // 커서 이동 시에도 현재 커서챗 상태를 함께 전송
  const updateCursorThrottled = useRef(
    throttle(
      (
        canvasId: string,
        socketRef: React.MutableRefObject<Socket | null>,
        x: number,
        y: number,
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
                chatActive: chatState.chatActive,
                chatMessage: chatState.chatMessage,
              },
            },
          }
          socketRef.current.emit('y:awareness', awarenessPayload)
        }
      },
      100,
    ),
  ).current

  const updateCursor = useCallback(
    (x: number, y: number) => {
      // 현재 위치 저장 (커서챗 전송 시 사용)
      cursorPositionRef.current = { x, y }
      updateCursorThrottled(canvasId, socketRef, x, y, cursorChatRef)
    },
    [canvasId, updateCursorThrottled],
  )

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
          cursor: { x, y, chatActive, chatMessage },
        },
      }
      socketRef.current.emit('y:awareness', awarenessPayload)
    },
    [canvasId],
  )

  // 포스트잇 추가 함수
  const addPostIt = (postit: PostIt) => {
    const doc = docRef.current
    if (!doc) return

    const yPostits = doc.getArray<Y.Map<unknown>>('postits')
    const yMap = new Y.Map()
    yMap.set('id', postit.id)
    yMap.set('x', postit.x)
    yMap.set('y', postit.y)
    yMap.set('width', postit.width)
    yMap.set('height', postit.height)
    yMap.set('fill', postit.fill)
    yMap.set('text', postit.text)
    yMap.set('authorName', postit.authorName)
    yPostits.push([yMap])
  }

  // 포스트잇 업데이트 함수 (위치, 텍스트 등)
  const updatePostIt = (id: string, updates: Partial<Omit<PostIt, 'id'>>) => {
    const doc = docRef.current
    if (!doc) return

    const yPostits = doc.getArray<Y.Map<unknown>>('postits')
    const index = yPostits.toArray().findIndex(yMap => yMap.get('id') === id)

    if (index === -1) return

    // Yjs 트랜잭션으로 명시적으로 감싸기
    doc.transact(() => {
      const yMap = yPostits.get(index)
      Object.entries(updates).forEach(([key, value]) => {
        yMap.set(key, value)
      })
    })
  }

  // 선 추가 함수
  const addLine = (line: Line) => {
    const doc = docRef.current
    if (!doc) return

    const yLines = doc.getArray<Y.Map<unknown>>('lines')
    const yMap = new Y.Map()
    yMap.set('id', line.id)
    yMap.set('points', line.points)
    yMap.set('stroke', line.stroke)
    yMap.set('strokeWidth', line.strokeWidth)
    yMap.set('tension', line.tension)
    yMap.set('lineCap', line.lineCap)
    yMap.set('lineJoin', line.lineJoin)
    yMap.set('tool', line.tool)
    yLines.push([yMap])
  }

  // 선 업데이트 함수 (주로 points 배열 업데이트)
  const updateLine = (id: string, updates: Partial<Omit<Line, 'id'>>) => {
    const doc = docRef.current
    if (!doc) return

    const yLines = doc.getArray<Y.Map<unknown>>('lines')
    const index = yLines.toArray().findIndex(yMap => yMap.get('id') === id)

    if (index === -1) return

    // Yjs 트랜잭션으로 명시적으로 감싸기
    doc.transact(() => {
      const yMap = yLines.get(index)
      Object.entries(updates).forEach(([key, value]) => {
        yMap.set(key, value)
      })
    })
  }

  return {
    isConnected,
    cursors,
    postits,
    lines,
    socketId,
    updateCursor,
    sendCursorChat,
    addPostIt,
    updatePostIt,
    addLine,
    updateLine,
  }
}
