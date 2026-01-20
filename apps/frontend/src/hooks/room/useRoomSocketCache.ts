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
  CategoryDeletedPayload,
  CategoryCreatedPayload,
  CategoryCreatePayload,
  CategoryDeletePayload,
  ErrorPayload,
} from '@/types/socket'
import type { Category, Participant } from '@/types/domain'
import { useSocketClient } from '@/hooks/useSocketClient'
import { socketBaseUrl } from '@/config/socket'
import { useToast } from '@/hooks/useToast'
import { RoomNotFoundError } from '@/types/socket-error.types'
import { roomQueryKeys } from './useRoomQueries'

export function useRoomSocketCache() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const { status, connect, getSocket } = useSocketClient({
    namespace: 'room',
    baseUrl: socketBaseUrl,
    autoConnect: false,
  })

  const [isReady, setIsReady] = useState(false)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const roomIdRef = useRef<string | null>(null)
  const userInfoRef = useRef<{ userId: string; name: string } | null>(null)
  const shouldRejoinRef = useRef(false)

  // Error Boundary로 에러 전파
  if (error) {
    throw error
  }

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
        // socketId 기준으로 중복 체크
        if (prev.some(x => x.socketId === p.socketId)) return prev
        return [...prev, { socketId: p.socketId, userId: p.userId, name: p.name }]
      })
    }

    const onDisconnected = (p: ParticipantDisconnectedPayload) => {
      const roomId = roomIdRef.current
      if (!roomId) return

      // socketId 기준으로 삭제 (같은 userId의 다른 세션은 유지)
      queryClient.setQueryData<Participant[]>(roomQueryKeys.participants(roomId), (prev = []) => prev.filter(x => x.socketId !== p.socketId))
    }

    const onNameUpdated = (p: ParticipantNameUpdatedPayload) => {
      const roomId = roomIdRef.current
      if (!roomId) return

      queryClient.setQueryData<Participant[]>(roomQueryKeys.participants(roomId), (prev = []) =>
        prev.map(participant => (participant.userId === p.userId ? { ...participant, name: p.name } : participant)),
      )
    }

    const onOwnerTransferred = ({ newOwnerId }: RoomOwnerTransferredPayload) => {
      const roomId = roomIdRef.current
      if (!roomId) return

      queryClient.setQueryData(roomQueryKeys.room(roomId), (prev: { roomId: string; ownerId: string } | undefined) => {
        if (!prev) return prev
        return { ...prev, ownerId: newOwnerId }
      })
    }

    const onCategoryCreated = (c: CategoryCreatedPayload) => {
      const roomId = roomIdRef.current
      if (!roomId) return

      queryClient.setQueryData<Category[]>(roomQueryKeys.categories(roomId), (prev = []) => [
        ...prev,
        { id: c.categoryId, roomId, title: c.name, orderIndex: 0, createdAt: new Date().toISOString() },
      ])
    }

    const onCategoryDeleted = (c: CategoryDeletedPayload) => {
      const roomId = roomIdRef.current
      if (!roomId) return

      queryClient.setQueryData<Category[]>(roomQueryKeys.categories(roomId), (prev = []) => prev.filter(x => x.id !== c.categoryId))
    }

    const onCategoryError = (errorPayload: ErrorPayload) => {
      // NOT_IN_ROOM 에러는 새로고침으로 상태 복구
      if (errorPayload.errorType === 'NOT_IN_ROOM') {
        window.location.reload()
        return
      }

      // 그 외 에러는 토스트로 표시
      showToast(errorPayload.message, 'error')
    }

    const onRoomError = (errorPayload: ErrorPayload) => {
      // NOT_FOUND 에러는 Error Boundary로 전파
      if (errorPayload.errorType === 'NOT_FOUND') {
        roomIdRef.current = null
        userInfoRef.current = null
        setRoomId(null)
        setIsReady(false)
        setError(new RoomNotFoundError(errorPayload.message))
        return
      }

      // 그 외 에러는 토스트로 표시
      showToast(errorPayload.message, 'error')
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
    socket.on('room:error', onRoomError)
    socket.on('participant:connected', onConnected)
    socket.on('participant:disconnected', onDisconnected)
    socket.on('participant:name_updated', onNameUpdated)
    socket.on('room:owner_transferred', onOwnerTransferred)
    socket.on('category:created', onCategoryCreated)
    socket.on('category:deleted', onCategoryDeleted)
    socket.on('category:error', onCategoryError)
    socket.on('disconnect', onDisconnect)
    socket.on('connect', onConnect)

    return () => {
      socket.off('room:joined', onReady)
      socket.off('room:error', onRoomError)
      socket.off('participant:connected', onConnected)
      socket.off('participant:disconnected', onDisconnected)
      socket.off('participant:name_updated', onNameUpdated)
      socket.off('room:owner_transferred', onOwnerTransferred)
      socket.off('category:created', onCategoryCreated)
      socket.off('category:deleted', onCategoryDeleted)
      socket.off('category:error', onCategoryError)
      socket.off('disconnect', onDisconnect)
      socket.off('connect', onConnect)
    }
  }, [getSocket, queryClient, showToast])

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

  const createCategory = useCallback(
    (name: string) => {
      const socket = getSocket()
      const currentRoomId = roomIdRef.current

      if (!socket?.connected) {
        console.warn('소켓이 연결되지 않았습니다. 카테고리를 생성할 수 없습니다.')
        return
      }

      if (!currentRoomId) {
        console.warn('방에 참여하지 않았습니다. 카테고리를 생성할 수 없습니다.')
        return
      }

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

  return { ready, roomId, joinRoom, leaveRoom, updateParticipantName, transferOwner, createCategory, deleteCategory }
}
