import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { socketBaseUrl } from '@/shared/config/socket'
import { useSocketClient } from '@/shared/hooks'
import {
  VOTE_EVENTS,
  createMockVoteSocket,
  type VoteCandidateUpdatedPayload,
  type VoteCountsUpdatedPayload,
  type VoteEndedPayload,
  type VoteError,
  type VoteMeUpdatedPayload,
  type VoteSocketLike,
  type VoteStartedPayload,
  type VoteState,
  type VoteStatePayload,
  type VoteStatus,
} from '../components/vote'

export interface UseVoteSocketOptions {
  roomId: string
  userId: string
  isOwner?: boolean
  enabled?: boolean
  useMock?: boolean
}

export interface UseVoteSocketResult {
  state: VoteState
  join: () => void
  leave: () => void
  resetError: () => void
}

const DEFAULT_STATUS: VoteStatus = 'WAITING'

function createInitialState(roomId: string, isOwner: boolean): VoteState {
  return {
    roomId,
    status: DEFAULT_STATUS,
    candidates: [],
    counts: {},
    myVotes: [],
    isOwner,
    isConnected: false,
    lastError: null,
  }
}

export function useVoteSocket({ roomId, userId, isOwner = false, enabled = true, useMock = false }: UseVoteSocketOptions): UseVoteSocketResult {
  const [state, setState] = useState<VoteState>(() => createInitialState(roomId, isOwner))

  const socketRef = useRef<VoteSocketLike | null>(null)
  const isJoinedRef = useRef(false)
  const joinedRoomIdRef = useRef<string | null>(null)
  const prevRoomIdRef = useRef(roomId)

  const handleSocketError = useCallback((error: Error) => {
    console.error('[vote] socket error:', error)
    setState(prev => ({
      ...prev,
      lastError: {
        code: 'SOCKET_ERROR',
        message: error.message,
      },
    }))
  }, [])

  const {
    getSocket,
    connect: connectReal,
    disconnect: disconnectReal,
  } = useSocketClient({
    namespace: 'vote',
    baseUrl: socketBaseUrl,
    autoConnect: enabled && !useMock,
    onError: handleSocketError,
  })

  useEffect(() => {
    const prevRoomId = prevRoomIdRef.current
    prevRoomIdRef.current = roomId

    if (!enabled) return
    if (!isJoinedRef.current) return
    if (!socketRef.current) return
    if (prevRoomId === roomId) return

    const joinedRoomId = joinedRoomIdRef.current
    if (!joinedRoomId || joinedRoomId === roomId) return

    // 외부 시스템(소켓) 정리만 수행하고, React state 초기화는 join/leave에서 처리한다.
    socketRef.current.emit(VOTE_EVENTS.leave, { roomId: joinedRoomId, userId })
    isJoinedRef.current = false
    joinedRoomIdRef.current = null

    if (useMock) {
      socketRef.current.disconnect()
      socketRef.current = null
      return
    }

    disconnectReal()
  }, [enabled, roomId, userId, useMock, disconnectReal])

  const resolveSocket = useCallback((): VoteSocketLike | null => {
    if (!enabled || !roomId) return null

    if (socketRef.current) return socketRef.current

    if (useMock) {
      const mock = createMockVoteSocket()
      mock.connect()
      socketRef.current = mock
      return mock
    }

    const realSocket = getSocket() as Socket | null
    if (!realSocket) return null

    socketRef.current = realSocket as unknown as VoteSocketLike
    return socketRef.current
  }, [enabled, roomId, useMock, getSocket])

  useEffect(() => {
    if (!enabled) return

    const socket = resolveSocket()
    if (!socket) return

    const handleConnect = () => {
      setState(prev => ({
        ...prev,
        isConnected: true,
      }))
    }

    const handleDisconnect = () => {
      setState(prev => ({
        ...prev,
        isConnected: false,
      }))
    }

    const handleState = (payload: VoteStatePayload) => {
      setState(prev => ({
        ...prev,
        roomId: payload.roomId,
        status: payload.status,
        candidates: payload.candidates,
        counts: payload.counts,
        myVotes: payload.myVotes ?? [],
        isOwner: payload.isOwner ?? prev.isOwner,
        lastError: null,
      }))
    }

    const handleStatusChanged = (payload: { roomId: string; status: VoteStatus }) => {
      setState(prev => ({
        ...prev,
        roomId: payload.roomId,
        status: payload.status,
      }))
    }

    const handleCandidateUpdated = (payload: VoteCandidateUpdatedPayload) => {
      setState(prev => {
        if (payload.action === 'add' && payload.candidate) {
          const exists = prev.candidates.some(candidate => candidate.id === payload.candidate?.id)
          if (exists) return prev

          return {
            ...prev,
            candidates: [...prev.candidates, payload.candidate],
            counts: {
              ...prev.counts,
              [payload.candidate.id]: prev.counts[payload.candidate.id] ?? 0,
            },
          }
        }

        if (payload.action === 'remove' && payload.candidateId) {
          const nextCandidates = prev.candidates.filter(candidate => candidate.id !== payload.candidateId)
          const nextCounts = { ...prev.counts }
          delete nextCounts[payload.candidateId]
          const nextMyVotes = prev.myVotes.filter(candidateId => candidateId !== payload.candidateId)

          return {
            ...prev,
            candidates: nextCandidates,
            counts: nextCounts,
            myVotes: nextMyVotes,
          }
        }

        return prev
      })
    }

    const handleCountsUpdated = (payload: VoteCountsUpdatedPayload) => {
      setState(prev => ({
        ...prev,
        counts: {
          ...prev.counts,
          [payload.candidateId]: payload.count,
        },
      }))
    }

    const handleMeUpdated = (payload: VoteMeUpdatedPayload) => {
      setState(prev => ({
        ...prev,
        myVotes: payload.myVotes,
      }))
    }

    const handleStarted = (payload: VoteStartedPayload) => {
      setState(prev => ({
        ...prev,
        roomId: payload.roomId,
        status: payload.status,
      }))
    }

    const handleEnded = (payload: VoteEndedPayload) => {
      setState(prev => ({
        ...prev,
        roomId: payload.roomId,
        status: payload.status,
      }))
    }

    const handleError = (payload: VoteError) => {
      setState(prev => ({
        ...prev,
        lastError: {
          code: payload.code,
          message: payload.message,
          actionId: payload.actionId,
          recoverable: payload.recoverable,
        },
      }))
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on(VOTE_EVENTS.state, handleState)
    socket.on(VOTE_EVENTS.statusChanged, handleStatusChanged)
    socket.on(VOTE_EVENTS.candidateUpdated, handleCandidateUpdated)
    socket.on(VOTE_EVENTS.countsUpdated, handleCountsUpdated)
    socket.on(VOTE_EVENTS.meUpdated, handleMeUpdated)
    socket.on(VOTE_EVENTS.started, handleStarted)
    socket.on(VOTE_EVENTS.stared, handleStarted)
    socket.on(VOTE_EVENTS.ended, handleEnded)
    socket.on(VOTE_EVENTS.error, handleError)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off(VOTE_EVENTS.state, handleState)
      socket.off(VOTE_EVENTS.statusChanged, handleStatusChanged)
      socket.off(VOTE_EVENTS.candidateUpdated, handleCandidateUpdated)
      socket.off(VOTE_EVENTS.countsUpdated, handleCountsUpdated)
      socket.off(VOTE_EVENTS.meUpdated, handleMeUpdated)
      socket.off(VOTE_EVENTS.started, handleStarted)
      socket.off(VOTE_EVENTS.stared, handleStarted)
      socket.off(VOTE_EVENTS.ended, handleEnded)
      socket.off(VOTE_EVENTS.error, handleError)
    }
  }, [enabled, resolveSocket])

  const join = useCallback(() => {
    if (!enabled || !roomId) return

    const socket = resolveSocket()
    if (!socket) return

    if (isJoinedRef.current && joinedRoomIdRef.current === roomId) return

    if (isJoinedRef.current && joinedRoomIdRef.current && joinedRoomIdRef.current !== roomId) {
      socket.emit(VOTE_EVENTS.leave, { roomId: joinedRoomIdRef.current, userId })
      isJoinedRef.current = false
      joinedRoomIdRef.current = null
    }

    setState(createInitialState(roomId, isOwner))

    if (!useMock && !socket.connected) {
      connectReal()
    }

    if (isJoinedRef.current) return

    socket.emit(VOTE_EVENTS.join, { roomId, userId, isOwner })
    isJoinedRef.current = true
    joinedRoomIdRef.current = roomId
  }, [enabled, roomId, userId, isOwner, useMock, resolveSocket, connectReal])

  const leave = useCallback(() => {
    const socket = socketRef.current
    if (!socket || !roomId) return

    socket.emit(VOTE_EVENTS.leave, { roomId, userId })
    isJoinedRef.current = false
    joinedRoomIdRef.current = null

    if (useMock) {
      socket.disconnect()
      socketRef.current = null
      setState(createInitialState(roomId, isOwner))
      return
    }

    disconnectReal()
    setState(createInitialState(roomId, isOwner))
  }, [roomId, userId, useMock, disconnectReal, isOwner])

  useEffect(() => {
    if (!enabled) return

    return () => {
      if (!isJoinedRef.current) return
      leave()
    }
  }, [enabled, leave])

  const resetError = useCallback(() => {
    setState(prev => ({
      ...prev,
      lastError: null,
    }))
  }, [])

  const initialState = useMemo(() => createInitialState(roomId, isOwner), [roomId, isOwner])
  const stableState = useMemo(() => {
    if (state.roomId !== roomId || state.isOwner !== isOwner) return initialState
    return state
  }, [state, roomId, isOwner, initialState])

  return {
    state: stableState,
    join,
    leave,
    resetError,
  }
}
