import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import type { RoomJoinPayload, RoomJoinedPayload, ParticipantConnectedPayload, ParticipantDisconnectedPayload } from '@/types/socket'
import type { Participant } from '@/types/domain'
import { useSocketClient } from '@/hooks/useSocketClient'
import { roomQueryKeys } from './useRoomQueries'

export function useRoomSocketCache() {
  const queryClient = useQueryClient()

  const { status, connect, getSocket } = useSocketClient({
    namespace: 'room',
    autoConnect: false,
  })

  const [isReady, setIsReady] = useState(false)
  const roomIdRef = useRef<string | null>(null)
  const userInfoRef = useRef<{ userId: string; name: string } | null>(null)

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const onReady = ({ roomId, me, participants, categories, ownerId }: RoomJoinedPayload) => {
      roomIdRef.current = roomId
      setIsReady(true)

      queryClient.setQueryData(roomQueryKeys.room(roomId), { roomId, me, ownerId })
      queryClient.setQueryData(roomQueryKeys.participants(roomId), participants)
      queryClient.setQueryData(roomQueryKeys.categories(roomId), categories)
    }

    const handleReconnect = () => {
      const roomId = roomIdRef.current
      const userInfo = userInfoRef.current

      if (roomId && userInfo && socket.connected) {
        socket.emit('room:join', { roomId, user: userInfo })
      }
    }

    const onConnected = (p: ParticipantConnectedPayload) => {
      const roomId = roomIdRef.current
      if (!roomId) return

      queryClient.setQueryData<Participant[]>(roomQueryKeys.participants(roomId), (prev = []) => {
        if (prev.some(x => x.userId === p.userId)) return prev
        return [...prev, { userId: p.userId, name: p.name }]
      })
    }

    const onDisconnected = (p: ParticipantDisconnectedPayload) => {
      const roomId = roomIdRef.current
      if (!roomId) return

      queryClient.setQueryData<Participant[]>(roomQueryKeys.participants(roomId), (prev = []) => prev.filter(x => x.userId !== p.userId))
    }

    const onDisconnect = (reason: Socket.DisconnectReason) => {
      setIsReady(false)

      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        const roomId = roomIdRef.current
        roomIdRef.current = null
        userInfoRef.current = null

        if (!roomId) return
        queryClient.removeQueries({ queryKey: roomQueryKeys.base(roomId) })
      }
    }

    socket.on('room:joined', onReady)
    socket.on('participant:connected', onConnected)
    socket.on('participant:disconnected', onDisconnected)
    socket.on('disconnect', onDisconnect)
    socket.on('connect', handleReconnect)

    return () => {
      socket.off('room:joined', onReady)
      socket.off('participant:connected', onConnected)
      socket.off('participant:disconnected', onDisconnected)
      socket.off('disconnect', onDisconnect)
      socket.off('connect', handleReconnect)
    }
  }, [getSocket, queryClient])

  const joinRoom = useCallback(
    (nextRoomId: string, user: { userId: string; name: string }) => {
      connect()

      const socket = getSocket()
      if (!socket) return

      roomIdRef.current = nextRoomId
      userInfoRef.current = user
      const payload: RoomJoinPayload = { roomId: nextRoomId, user }

      if (socket.connected) {
        socket.emit('room:join', payload)
        return
      }

      socket.once('connect', () => socket.emit('room:join', payload))
    },
    [connect, getSocket],
  )

  const leaveRoom = useCallback(() => {
    const socket = getSocket()
    const roomId = roomIdRef.current

    if (socket?.connected) socket.emit('room:leave')

    roomIdRef.current = null
    userInfoRef.current = null
    setIsReady(false)

    if (!roomId) return
    queryClient.removeQueries({ queryKey: roomQueryKeys.base(roomId) })
  }, [getSocket, queryClient])

  const ready = useMemo(() => status === 'connected' && isReady, [status, isReady])

  return { ready, joinRoom, leaveRoom }
}
