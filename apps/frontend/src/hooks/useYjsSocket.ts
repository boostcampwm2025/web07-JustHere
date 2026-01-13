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

interface UseYjsSocketOptions {
  roomId: string
  canvasId: string
  serverUrl?: string
}

export function useYjsSocket({ roomId, canvasId, serverUrl = 'http://localhost:3000' }: UseYjsSocketOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [cursors, setCursors] = useState<Map<string, CursorPositionWithId>>(new Map())

  const socketRef = useRef<Socket | null>(null)
  const docRef = useRef<Y.Doc | null>(null)

  useEffect(() => {
    // Yjs 문서 초기화
    const doc = new Y.Doc()
    docRef.current = doc

    // Socket.io 연결
    const socket = io(`${serverUrl}/canvas`, {
      transports: ['websocket'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)

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
        Y.applyUpdate(doc, updateArray)
      }
    })

    // 캔버스 나가기 완료
    socket.on('canvas:detached', () => {
      // 처리 로직
    })

    // Yjs 업데이트 수신
    socket.on('y:update', (payload: YjsUpdateBroadcast) => {
      const updateArray = new Uint8Array(payload.update)
      Y.applyUpdate(doc, updateArray)
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

  return {
    isConnected,
    cursors,
    updateCursor,
  }
}
