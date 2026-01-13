import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import * as Y from 'yjs'

interface UseYjsSocketOptions {
  roomId: string
  categoryId: string
  serverUrl?: string
}

interface CursorPosition {
  x: number
  y: number
  socketId: string
}

export function useYjsSocket({ roomId, categoryId, serverUrl = 'http://localhost:3000' }: UseYjsSocketOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionCount, setConnectionCount] = useState(0)
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map())

  const socketRef = useRef<Socket | null>(null)
  const docRef = useRef<Y.Doc | null>(null)

  useEffect(() => {
    // Yjs 문서 초기화
    const doc = new Y.Doc()
    docRef.current = doc

    // Socket.io 연결
    const socket = io(`${serverUrl}/category`, {
      transports: ['websocket'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)

      // 방 참여
      socket.emit('category:join', { roomId, categoryId })
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    // 초기 동기화
    socket.on('category:sync', ({ update }: { categoryId: string; update: number[] }) => {
      const updateArray = new Uint8Array(update)
      Y.applyUpdate(doc, updateArray)
    })

    // 다른 클라이언트의 업데이트 수신
    socket.on('category:update', ({ update }: { categoryId: string; update: number[]; from: string }) => {
      const updateArray = new Uint8Array(update)
      Y.applyUpdate(doc, updateArray)
    })

    // 사용자 참여 알림
    socket.on('category:user_joined', ({ connectionCount: count }: { socketId: string; connectionCount: number }) => {
      setConnectionCount(count)
    })

    // 사용자 퇴장 알림
    socket.on('category:user_left', ({ socketId, connectionCount: count }: { socketId: string; connectionCount: number }) => {
      setConnectionCount(count)
      setCursors(prev => {
        const next = new Map(prev)
        next.delete(socketId)
        return next
      })
    })

    // Awareness 업데이트 (커서 위치)
    socket.on('category:awareness', ({ socketId, state }: { socketId: string; state: any }) => {
      if (state.cursor) {
        setCursors(prev => {
          const next = new Map(prev)
          next.set(socketId, { ...state.cursor, socketId })
          return next
        })
      }
    })

    // Yjs 문서 변경 시 서버로 전송
    const updateHandler = (update: Uint8Array, origin: any) => {
      // 로컬 변경만 전송 (원격에서 받은 업데이트는 재전송하지 않음)
      if (origin !== socket) {
        socket.emit('category:update', {
          categoryId,
          update: Array.from(update),
        })
      }
    }

    doc.on('update', updateHandler)

    return () => {
      // 방 나가기
      socket.emit('category:leave', { categoryId })

      doc.off('update', updateHandler)
      socket.disconnect()
      doc.destroy()
    }
  }, [roomId, categoryId, serverUrl])

  // 커서 위치 업데이트 함수
  const updateCursor = (x: number, y: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('category:awareness', {
        categoryId,
        state: {
          cursor: { x, y },
        },
      })
    }
  }

  return {
    doc: docRef.current,
    socket: socketRef.current,
    isConnected,
    connectionCount,
    cursors,
    updateCursor,
  }
}
