import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io, type Socket, type ManagerOptions, type SocketOptions } from 'socket.io-client'

type SocketStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

const SOCKET_RECONNECTION_CONFIG = {
  maxAttempts: 5,
  delay: 1000,
  delayMax: 5000,
} as const

interface UseSocketClientProps {
  namespace?: 'room' | 'canvas'
  autoConnect?: boolean
  autoReconnect?: boolean
  ioOptions?: Partial<ManagerOptions & SocketOptions>
  onError?: (error: Error) => void
}

export function useSocketClient({ namespace, autoConnect = true, autoReconnect = true, ioOptions, onError }: UseSocketClientProps) {
  const socketRef = useRef<Socket | null>(null)
  const reconnectAttemptsRef = useRef(0)

  const fullUrl = useMemo(() => {
    return `${window.location.origin}${namespace ? `/${namespace}` : ''}`
  }, [namespace])

  const [status, setStatus] = useState<SocketStatus>(autoConnect ? 'connecting' : 'disconnected')

  useEffect(() => {
    const socket = io(fullUrl, {
      autoConnect: false,
      transports: ['websocket'],
      reconnection: autoReconnect,
      reconnectionAttempts: SOCKET_RECONNECTION_CONFIG.maxAttempts,
      reconnectionDelay: SOCKET_RECONNECTION_CONFIG.delay,
      reconnectionDelayMax: SOCKET_RECONNECTION_CONFIG.delayMax,
      ...ioOptions,
    })

    socketRef.current = socket

    const handleConnect = () => {
      setStatus('connected')
      reconnectAttemptsRef.current = 0
    }

    const handleDisconnect = (reason: Socket.DisconnectReason) => {
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        setStatus('disconnected')
        reconnectAttemptsRef.current = 0
        return
      }

      setStatus('reconnecting')
    }

    const handleConnectError = (error: Error) => {
      setStatus('reconnecting')
      onError?.(error)
    }

    const handleReconnectAttempt = (attemptNumber: number) => {
      reconnectAttemptsRef.current = attemptNumber
      setStatus('reconnecting')

      if (attemptNumber >= SOCKET_RECONNECTION_CONFIG.maxAttempts) {
        setStatus('disconnected')
        onError?.(new Error(`연결 실패: 최대 재연결 시도 횟수(${SOCKET_RECONNECTION_CONFIG.maxAttempts})를 초과했습니다.`))
      }
    }

    const handleError = (error: Error) => {
      onError?.(error)
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleConnectError)
    socket.on('reconnect_attempt', handleReconnectAttempt)
    socket.on('reconnect_error', handleError)
    socket.on('error', handleError)

    if (autoConnect) socket.connect()

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleConnectError)
      socket.off('reconnect_attempt', handleReconnectAttempt)
      socket.off('reconnect_error', handleError)
      socket.off('error', handleError)
      socket.disconnect()
      socketRef.current = null
      reconnectAttemptsRef.current = 0
    }
  }, [fullUrl, autoConnect, autoReconnect, ioOptions, onError])

  const connect = useCallback(() => {
    const socket = socketRef.current
    if (!socket || socket.connected) return

    setStatus('connecting')
    reconnectAttemptsRef.current = 0
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
