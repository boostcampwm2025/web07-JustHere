import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import type {
  RoomJoinPayload,
  RoomJoinedPayload,
  ParticipantConnectedPayload,
  ParticipantDisconnectedPayload,
  ParticipantNameUpdatedPayload,
  ParticipantUpdateNamePayload,
  RoomOwnerTransferredPayload,
  RoomTransferOwnerPayload,
} from '@/types/socket'
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
  const [roomId, setRoomId] = useState<string | null>(null)
  const roomIdRef = useRef<string | null>(null)
  const userInfoRef = useRef<{ userId: string; name: string } | null>(null)
  const shouldRejoinRef = useRef(false)

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const onReady = ({ roomId, participants, categories, ownerId }: RoomJoinedPayload) => {
      roomIdRef.current = roomId
      setRoomId(roomId)
      setIsReady(true)

      queryClient.setQueryData(roomQueryKeys.room(roomId), { roomId, ownerId })
      queryClient.setQueryData(roomQueryKeys.participants(roomId), participants)
      queryClient.setQueryData(roomQueryKeys.categories(roomId), categories)
    }

    const onConnect = () => {
      if (!shouldRejoinRef.current) return

      const roomId = roomIdRef.current
      const user = userInfoRef.current
      if (!roomId || !user) return

      socket.emit('room:join', { roomId, user } satisfies RoomJoinPayload)
      shouldRejoinRef.current = false
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

    const onNameUpdated = (p: ParticipantNameUpdatedPayload) => {
      const roomId = roomIdRef.current
      if (!roomId) return

      queryClient.setQueryData<Participant[]>(roomQueryKeys.participants(roomId), (prev = []) =>
        prev.map(participant => (participant.userId === p.userId ? { ...participant, name: p.name } : participant)),
      )
      queryClient.setQueryData(roomQueryKeys.room(roomId), (prev: { roomId: string; me: Participant; ownerId: string } | undefined) => {
        if (!prev || prev.me.userId !== p.userId) return prev
        return { ...prev, me: { ...prev.me, name: p.name } }
      })
    }

    const onOwnerTransferred = ({ newOwnerId }: RoomOwnerTransferredPayload) => {
      const roomId = roomIdRef.current
      if (!roomId) return

      queryClient.setQueryData(roomQueryKeys.room(roomId), (prev: { roomId: string; me: Participant; ownerId: string } | undefined) => {
        if (!prev) return prev
        return { ...prev, ownerId: newOwnerId }
      })
    }

    const onDisconnect = (reason: Socket.DisconnectReason) => {
      setRoomId(null)
      setIsReady(false)

      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        shouldRejoinRef.current = false

        const roomId = roomIdRef.current
        roomIdRef.current = null
        userInfoRef.current = null

        if (roomId) queryClient.removeQueries({ queryKey: roomQueryKeys.base(roomId) })
        return
      }

      shouldRejoinRef.current = true
    }

    socket.on('room:joined', onReady)
    socket.on('participant:connected', onConnected)
    socket.on('participant:disconnected', onDisconnected)
    socket.on('participant:name_updated', onNameUpdated)
    socket.on('room:owner_transferred', onOwnerTransferred)
    socket.on('disconnect', onDisconnect)
    socket.on('connect', onConnect)

    return () => {
      socket.off('room:joined', onReady)
      socket.off('participant:connected', onConnected)
      socket.off('participant:disconnected', onDisconnected)
      socket.off('participant:name_updated', onNameUpdated)
      socket.off('room:owner_transferred', onOwnerTransferred)
      socket.off('disconnect', onDisconnect)
      socket.off('connect', onConnect)
    }
  }, [getSocket, queryClient])

  const joinRoom = useCallback(
    (nextRoomId: string, user: { userId: string; name: string }) => {
      connect()

      const socket = getSocket()
      if (!socket) return

      roomIdRef.current = nextRoomId
      userInfoRef.current = user

      shouldRejoinRef.current = false

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

    shouldRejoinRef.current = false
    if (socket?.connected) socket.emit('room:leave')

    roomIdRef.current = null
    setRoomId(null)
    setIsReady(false)

    if (roomId) queryClient.removeQueries({ queryKey: roomQueryKeys.base(roomId) })
  }, [getSocket, queryClient])

  const updateParticipantName = useCallback(
    (name: string) => {
      const socket = getSocket()
      if (!socket?.connected) return

      const trimmed = name.trim()
      if (!trimmed) return

      if (userInfoRef.current) {
        userInfoRef.current = { ...userInfoRef.current, name: trimmed }
      }

      socket.emit('participant:update_name', { name: trimmed } satisfies ParticipantUpdateNamePayload)
    },
    [getSocket],
  )

  const transferOwner = useCallback(
    (targetUserId: string) => {
      const socket = getSocket()
      if (!socket?.connected) return

      const trimmed = targetUserId.trim()
      if (!trimmed) return

      socket.emit('room:transfer_owner', { targetUserId: trimmed } satisfies RoomTransferOwnerPayload)
    },
    [getSocket],
  )

  const ready = useMemo(() => status === 'connected' && isReady, [status, isReady])

  return { ready, roomId, joinRoom, leaveRoom, updateParticipantName, transferOwner }
}
