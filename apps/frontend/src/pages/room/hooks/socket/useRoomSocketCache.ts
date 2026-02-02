import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import { RoomNotFoundError } from '@/app/error-boundary'
import type {
  RoomJoinPayload,
  RoomJoinedPayload,
  ParticipantConnectedPayload,
  ParticipantDisconnectedPayload,
  ParticipantNameUpdatedPayload,
  ParticipantUpdateNamePayload,
  RoomOwnerTransferredPayload,
  RoomTransferOwnerPayload,
  RoomRegionUpdatedPayload,
  CategoryDeletedPayload,
  CategoryCreatedPayload,
  CategoryCreatePayload,
  CategoryDeletePayload,
  ErrorPayload,
  Category,
  Participant,
  User,
} from '@/shared/types'
import { socketBaseUrl } from '@/shared/config/socket'
import { useToast, roomQueryKeys, voteQueryKeys, useSocketClient } from '@/shared/hooks'
import { addSocketBreadcrumb } from '@/shared/utils'

export const useRoomSocketCache = () => {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const { status, connect, getSocket } = useSocketClient({
    namespace: 'room',
    baseUrl: socketBaseUrl,
    autoConnect: false,
  })

  const [isReady, setIsReady] = useState(false)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [currentRegion, setCurrentRegion] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const roomIdRef = useRef<string | null>(null)
  const userInfoRef = useRef<User | null>(null)
  const shouldRejoinRef = useRef(false)

  if (error) throw error

  const handleErrorWithToast = useCallback(
    (errorPayload: ErrorPayload) => {
      if (errorPayload.errorType === 'NOT_IN_ROOM') {
        window.location.reload()
        return
      }

      showToast(errorPayload.message, 'error')
    },
    [showToast],
  )

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const onJoined = ({ roomId, participants, categories, ownerId, place_name }: RoomJoinedPayload) => {
      roomIdRef.current = roomId
      setRoomId(roomId)
      setIsReady(true)
      setCurrentRegion(place_name ?? null)

      addSocketBreadcrumb('room:joined', { roomId, ownerId, participants: participants.length, categories: categories.length })

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

    const onParticipantConnected = ({ socketId, userId, name }: ParticipantConnectedPayload) => {
      const roomId = roomIdRef.current
      if (!roomId) return

      queryClient.setQueryData<Participant[]>(roomQueryKeys.participants(roomId), (prev = []) => {
        if (prev.some(x => x.socketId === socketId)) return prev
        return [...prev, { socketId, userId, name }]
      })
    }

    const onParticipantDisconnected = ({ socketId }: ParticipantDisconnectedPayload) => {
      const roomId = roomIdRef.current
      if (!roomId) return

      queryClient.setQueryData<Participant[]>(roomQueryKeys.participants(roomId), (prev = []) => prev.filter(x => x.socketId !== socketId))
    }

    const onParticipantNameUpdated = ({ userId, name }: ParticipantNameUpdatedPayload) => {
      const roomId = roomIdRef.current
      if (!roomId) return

      queryClient.setQueryData<Participant[]>(roomQueryKeys.participants(roomId), (prev = []) =>
        prev.map(participant => (participant.userId === userId ? { ...participant, name } : participant)),
      )
    }

    const onOwnerTransferred = ({ newOwnerId }: RoomOwnerTransferredPayload) => {
      const roomId = roomIdRef.current
      if (!roomId) return

      addSocketBreadcrumb('room:owner_transferred', { roomId, newOwnerId })

      queryClient.setQueryData(roomQueryKeys.room(roomId), (prev: { roomId: string; ownerId: string } | undefined) => {
        if (!prev) return prev
        return { ...prev, ownerId: newOwnerId }
      })
    }

    const onRegionUpdated = ({ place_name }: RoomRegionUpdatedPayload) => {
      setCurrentRegion(place_name)
    }

    const onCategoryCreated = ({ categoryId, name }: CategoryCreatedPayload) => {
      const roomId = roomIdRef.current
      if (!roomId) return

      addSocketBreadcrumb('category:created', { roomId, categoryId })

      queryClient.setQueryData<Category[]>(roomQueryKeys.categories(roomId), (prev = []) => [
        ...prev,
        { id: categoryId, roomId, title: name, orderIndex: 0, createdAt: new Date().toISOString() },
      ])
    }

    const onCategoryDeleted = ({ categoryId }: CategoryDeletedPayload) => {
      const roomId = roomIdRef.current
      if (!roomId) return

      addSocketBreadcrumb('category:deleted', { roomId, categoryId })

      queryClient.setQueryData<Category[]>(roomQueryKeys.categories(roomId), (prev = []) => prev.filter(x => x.id !== categoryId))
      queryClient.invalidateQueries({ queryKey: voteQueryKeys.results(roomId) })
    }

    const onCategoryError = (errorPayload: ErrorPayload) => {
      addSocketBreadcrumb('category:error', { errorType: errorPayload.errorType }, 'warning')
      handleErrorWithToast(errorPayload)
    }

    const onRoomError = (errorPayload: ErrorPayload) => {
      addSocketBreadcrumb('room:error', { errorType: errorPayload.errorType }, 'warning')
      // NOT_FOUND 에러는 Error Boundary로 전파
      if (errorPayload.errorType === 'NOT_FOUND') {
        roomIdRef.current = null
        userInfoRef.current = null
        setRoomId(null)
        setIsReady(false)
        setError(new RoomNotFoundError(errorPayload.message))
        return
      }

      handleErrorWithToast(errorPayload)
    }

    const onDisconnect = (reason: Socket.DisconnectReason) => {
      setRoomId(null)
      setIsReady(false)

      if (isHardDisconnect(reason)) {
        shouldRejoinRef.current = false

        const roomId = roomIdRef.current
        roomIdRef.current = null
        userInfoRef.current = null

        if (roomId) queryClient.removeQueries({ queryKey: roomQueryKeys.base(roomId) })
        return
      }

      shouldRejoinRef.current = true
    }

    socket.on('room:joined', onJoined)
    socket.on('participant:connected', onParticipantConnected)
    socket.on('participant:disconnected', onParticipantDisconnected)
    socket.on('participant:name_updated', onParticipantNameUpdated)
    socket.on('room:owner_transferred', onOwnerTransferred)
    socket.on('room:region_updated', onRegionUpdated)
    socket.on('room:error', onRoomError)
    socket.on('category:created', onCategoryCreated)
    socket.on('category:deleted', onCategoryDeleted)
    socket.on('category:error', onCategoryError)
    socket.on('disconnect', onDisconnect)
    socket.on('connect', onConnect)

    return () => {
      socket.off('room:joined', onJoined)
      socket.off('participant:connected', onParticipantConnected)
      socket.off('participant:disconnected', onParticipantDisconnected)
      socket.off('participant:name_updated', onParticipantNameUpdated)
      socket.off('room:owner_transferred', onOwnerTransferred)
      socket.off('room:region_updated', onRegionUpdated)
      socket.off('room:error', onRoomError)
      socket.off('category:created', onCategoryCreated)
      socket.off('category:deleted', onCategoryDeleted)
      socket.off('category:error', onCategoryError)
      socket.off('disconnect', onDisconnect)
      socket.off('connect', onConnect)
    }
  }, [getSocket, queryClient, handleErrorWithToast])

  const joinRoom = useCallback(
    (nextRoomId: string, user: User) => {
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
    if (!socket?.connected) return

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

  const createCategory = useCallback(
    (name: string) => {
      const socket = getSocket()
      if (!socket?.connected) return

      socket.emit('category:create', { name } satisfies CategoryCreatePayload)
    },
    [getSocket],
  )

  const deleteCategory = useCallback(
    (categoryId: string) => {
      const socket = getSocket()
      if (!socket?.connected) return

      socket.emit('category:delete', { categoryId } satisfies CategoryDeletePayload)
    },
    [getSocket],
  )

  return { ready, roomId, currentRegion, joinRoom, leaveRoom, updateParticipantName, transferOwner, createCategory, deleteCategory }
}

const isHardDisconnect = (reason: Socket.DisconnectReason) => {
  return reason === 'io server disconnect' || reason === 'io client disconnect'
}
