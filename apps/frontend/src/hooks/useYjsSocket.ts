import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import * as Y from 'yjs'
import type {
  CanvasAttachPayload,
  CanvasDetachPayload,
  YjsUpdatePayload,
  YjsAwarenessPayload,
  CanvasAttachedPayload,
  YjsUpdateBroadcast,
  YjsAwarenessBroadcast,
  CursorPositionWithId,
} from '@/types/yjs.types'
import type { Rectangle, PostIt, Line } from '@/types/canvas.types'

interface UseYjsSocketOptions {
  roomId: string
  canvasId: string
  serverUrl?: string
}

export function useYjsSocket({ roomId, canvasId, serverUrl = 'http://localhost:3000' }: UseYjsSocketOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [cursors, setCursors] = useState<Map<string, CursorPositionWithId>>(new Map())
  const [rectangles, setRectangles] = useState<Rectangle[]>([])
  const [postits, setPostits] = useState<PostIt[]>([])
  const [lines, setLines] = useState<Line[]>([])
  const [socketId, setSocketId] = useState('unknown')

  const socketRef = useRef<Socket | null>(null)
  const docRef = useRef<Y.Doc | null>(null)

  useEffect(() => {
    // Yjs 문서 초기화
    const doc = new Y.Doc()
    docRef.current = doc

    // Yjs SharedTypes 생성
    const yRectangles = doc.getArray<Y.Map<unknown>>('rectangles')
    const yPostits = doc.getArray<Y.Map<unknown>>('postits')
    const yLines = doc.getArray<Y.Map<unknown>>('lines')

    // Yjs 변경사항을 React state에 반영하는 함수
    const syncRectanglesToState = () => {
      const rects: Rectangle[] = yRectangles.toArray().map(yMap => ({
        id: yMap.get('id') as string,
        x: yMap.get('x') as number,
        y: yMap.get('y') as number,
        width: yMap.get('width') as number,
        height: yMap.get('height') as number,
        fill: yMap.get('fill') as string,
      }))
      setRectangles(rects)
    }

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
    yRectangles.observeDeep(syncRectanglesToState)
    yPostits.observeDeep(syncPostitsToState)
    yLines.observeDeep(syncLinesToState)

    // 초기 동기화
    syncRectanglesToState()
    syncPostitsToState()
    syncLinesToState()

    // Socket.io 연결
    const socket = io(`${serverUrl}/canvas`, {
      transports: ['websocket'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
      setSocketId(socket.id || 'unknown')

      // 캔버스 참여
      const attachPayload: CanvasAttachPayload = { roomId, canvasId }
      socket.emit('canvas:attach', attachPayload)
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    // 캔버스 참여 완료 (초기 동기화)
    socket.on('canvas:attached', (payload: CanvasAttachedPayload) => {
      if (payload.update) {
        const updateArray = new Uint8Array(payload.update)
        // origin을 socket으로 명시하여 재전송 방지
        Y.applyUpdate(doc, updateArray, socket)
      }
    })

    // 캔버스 나가기 완료
    socket.on('canvas:detached', () => {
      // TODO: 카테고리 나갔을 때 처리 로직
    })

    // Yjs 업데이트 수신
    socket.on('y:update', (payload: YjsUpdateBroadcast) => {
      const updateArray = new Uint8Array(payload.update)
      // origin을 socket으로 명시하여 재전송 방지
      Y.applyUpdate(doc, updateArray, socket)
    })

    // Awareness 업데이트 (커서 위치)
    socket.on('y:awareness', (payload: YjsAwarenessBroadcast) => {
      if (payload.state.cursor) {
        setCursors(prev => {
          const next = new Map(prev)
          next.set(payload.socketId, { ...payload.state.cursor!, socketId: payload.socketId })
          return next
        })
      } else {
        // 커서가 없으면 제거 (사용자가 나간 경우)
        setCursors(prev => {
          const next = new Map(prev)
          next.delete(payload.socketId)
          return next
        })
      }
    })

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

    doc.on('update', updateHandler)

    return () => {
      // 캔버스 나가기
      const detachPayload: CanvasDetachPayload = { canvasId }
      socket.emit('canvas:detach', detachPayload)

      doc.off('update', updateHandler)
      yRectangles.unobserveDeep(syncRectanglesToState)
      yPostits.unobserveDeep(syncPostitsToState)
      yLines.unobserveDeep(syncLinesToState)
      socket.disconnect()
      doc.destroy()
    }
  }, [roomId, canvasId, serverUrl])

  // 커서 위치 업데이트 함수
  const updateCursor = (x: number, y: number) => {
    if (socketRef.current?.connected) {
      const awarenessPayload: YjsAwarenessPayload = {
        canvasId,
        state: {
          cursor: { x, y },
        },
      }
      socketRef.current.emit('y:awareness', awarenessPayload)
    }
  }

  // 네모 추가 함수
  const addRectangle = (rect: Rectangle) => {
    const doc = docRef.current
    if (!doc) return

    const yRectangles = doc.getArray<Y.Map<unknown>>('rectangles')
    const yMap = new Y.Map()
    yMap.set('id', rect.id)
    yMap.set('x', rect.x)
    yMap.set('y', rect.y)
    yMap.set('width', rect.width)
    yMap.set('height', rect.height)
    yMap.set('fill', rect.fill)
    yRectangles.push([yMap])
  }

  // 네모 위치 업데이트 함수
  const updateRectangle = (id: string, updates: Partial<Omit<Rectangle, 'id'>>) => {
    const doc = docRef.current
    if (!doc) return

    const yRectangles = doc.getArray<Y.Map<unknown>>('rectangles')
    const index = yRectangles.toArray().findIndex(yMap => yMap.get('id') === id)

    // Yjs 트랜잭션으로 명시적으로 감싸기
    doc.transact(() => {
      const yMap = yRectangles.get(index)
      Object.entries(updates).forEach(([key, value]) => {
        yMap.set(key, value)
      })
    })
  }

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
    rectangles,
    postits,
    lines,
    socketId,
    updateCursor,
    addRectangle,
    updateRectangle,
    addPostIt,
    updatePostIt,
    addLine,
    updateLine,
  }
}
