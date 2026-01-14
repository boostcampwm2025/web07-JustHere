import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io, type Socket, type ManagerOptions, type SocketOptions } from 'socket.io-client'

type SocketStatus = 'disconnected' | 'connecting' | 'connected'

interface UseSocketClientProps {
  namespace?: 'room' | 'canvas'
  autoConnect?: boolean
  ioOptions?: Partial<ManagerOptions & SocketOptions>
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000'

export function useSocketClient({ namespace, autoConnect = true, ioOptions }: UseSocketClientProps) {
  const socketRef = useRef<Socket | null>(null)

  const fullUrl = useMemo(() => {
    return `${SOCKET_URL}${namespace ? `/${namespace}` : ''}`
  }, [namespace])

  const [status, setStatus] = useState<SocketStatus>(autoConnect ? 'connecting' : 'disconnected')

  useEffect(() => {
    const socket = io(fullUrl, {
      autoConnect: false,
      transports: ['websocket'],
      ...ioOptions,
    })

    socketRef.current = socket

    socket.on('connect', () => setStatus('connected'))
    socket.on('disconnect', () => setStatus('disconnected'))
    socket.on('connect_error', () => setStatus('disconnected'))

    if (autoConnect) socket.connect()

    return () => {
      socket.off('connect', () => setStatus('connected'))
      socket.off('disconnect', () => setStatus('disconnected'))
      socket.off('connect_error', () => setStatus('disconnected'))
      socket.disconnect()
      socketRef.current = null
    }
  }, [fullUrl, autoConnect, ioOptions])

  const connect = useCallback(() => {
    const socket = socketRef.current
    if (!socket || socket.connected) return

    setStatus('connecting')
    socket.connect()
  }, [])

  const disconnect = useCallback(() => {
    const socket = socketRef.current
    if (!socket) return

    socket.disconnect()
    setStatus('disconnected')
  }, [])

  const emit = useCallback(<T>(event: string, data?: T) => {
    const socket = socketRef.current
    if (!socket?.connected) return

    socket.emit(event, data)
  }, [])

  const getSocket = useCallback(() => socketRef.current, [])

  return {
    status,
    connect,
    disconnect,
    emit,
    getSocket,
  }
}
