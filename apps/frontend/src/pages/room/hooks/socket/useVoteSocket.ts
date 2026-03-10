import { useCallback, useEffect, useLayoutEffect, useReducer, useRef } from 'react'
import { socketBaseUrl } from '@/shared/config/socket'
import { useSocketClient, useToast } from '@/shared/hooks'
import { addSocketBreadcrumb, reportError } from '@/shared/utils'
import { VOTE_EVENTS } from '@/pages/room/constants'
import type { VoteCandidate, VoteCandidateAddPayload, VoteSocketLike } from '@/pages/room/types'
import { voteReducer, initialVoteState } from './voteReducer'
import { useVoteSocketEvents } from './useVoteSocketEvents'

interface UseVoteSocketOptions {
  roomId: string
  categoryId: string
  userId: string
  enabled?: boolean
}

interface JoinState {
  isJoined: boolean
  roomId: string | null
  categoryId: string | null
  isPending: boolean
  shouldJoin: boolean
}

const initialJoinState: JoinState = {
  isJoined: false,
  roomId: null,
  categoryId: null,
  isPending: false,
  shouldJoin: false,
}

export function useVoteSocket({ roomId, categoryId, userId, enabled = true }: UseVoteSocketOptions) {
  const { showToast } = useToast()

  const [state, dispatch] = useReducer(voteReducer, initialVoteState)

  // 이벤트 핸들러에서 최신 state 참조 (stale closure 방지)
  const stateRef = useRef(state)
  useLayoutEffect(() => {
    stateRef.current = state
  })

  // optimistic add 중복 방지
  const tempCandidateIdsRef = useRef<Set<string>>(new Set())

  const joinRef = useRef<JoinState>({ ...initialJoinState })
  const prevRoomIdRef = useRef<string>(roomId)
  const prevCategoryIdRef = useRef<string>(categoryId)

  const handleSocketError = useCallback(
    (error: Error) => {
      reportError({
        error,
        code: 'SOCKET_ERROR',
        context: { namespace: 'vote', roomId, categoryId },
      })
      dispatch({
        type: 'SET_ERROR',
        error: {
          status: 'ERROR',
          statusCode: 0,
          errorType: 'SOCKET_ERROR',
          message: error.message,
          timestamp: new Date().toISOString(),
        },
      })
      joinRef.current.isPending = false
    },
    [roomId, categoryId],
  )

  const {
    getSocket,
    status: socketStatus,
    connect: connectReal,
    disconnect: disconnectReal,
  } = useSocketClient({
    namespace: 'vote',
    baseUrl: socketBaseUrl,
    autoConnect: enabled,
    onError: handleSocketError,
  })

  const isConnected = socketStatus === 'connected'

  const resolveSocket = useCallback((): VoteSocketLike | null => {
    if (!enabled || !roomId) return null
    return getSocket()
  }, [enabled, roomId, getSocket])

  const resetState = useCallback(() => {
    dispatch({ type: 'RESET' })
    tempCandidateIdsRef.current.clear()
  }, [])

  const handleTempCandidateClear = useCallback(() => {
    tempCandidateIdsRef.current.clear()
  }, [])

  const handleTempCandidateRemove = useCallback((placeId: string) => {
    tempCandidateIdsRef.current.delete(placeId)
  }, [])

  // category 변경 시 이전 room leave
  useEffect(() => {
    const prevRoomId = prevRoomIdRef.current
    const prevCategoryId = prevCategoryIdRef.current
    prevRoomIdRef.current = roomId
    prevCategoryIdRef.current = categoryId

    if (!enabled) return
    if (!joinRef.current.isJoined) return
    if (prevRoomId === roomId && prevCategoryId === categoryId) return

    const { roomId: joinedRoomId, categoryId: joinedCategoryId } = joinRef.current
    if (!joinedRoomId || !joinedCategoryId) return
    if (joinedRoomId === roomId && joinedCategoryId === categoryId) return

    const socket = resolveSocket()
    if (!socket) return

    socket.emit(VOTE_EVENTS.leave, { roomId: joinedRoomId, categoryId: joinedCategoryId, userId })
    addSocketBreadcrumb('vote:leave', { roomId: joinedRoomId, categoryId: joinedCategoryId })
    joinRef.current = { ...initialJoinState }
    resetState()
  }, [enabled, roomId, categoryId, userId, resolveSocket, resetState])

  // connect/disconnect — 재연결 시 자동 rejoin
  useEffect(() => {
    if (!enabled) return

    const socket = resolveSocket()
    if (!socket) return

    const handleConnect = () => {
      addSocketBreadcrumb('vote:connect', { roomId })
      joinRef.current.isPending = false
      if (joinRef.current.shouldJoin && !joinRef.current.isJoined && categoryId) {
        socket.emit(VOTE_EVENTS.join, { roomId, categoryId, userId })
        addSocketBreadcrumb('vote:join', { roomId })
        joinRef.current = { isJoined: true, roomId, categoryId, isPending: false, shouldJoin: false }
      }
    }

    const handleDisconnect = () => {
      addSocketBreadcrumb('vote:disconnect', { roomId })
      if (joinRef.current.isJoined) {
        joinRef.current = { isJoined: false, roomId: null, categoryId: null, isPending: false, shouldJoin: true }
      } else {
        joinRef.current.isPending = false
      }
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
    }
  }, [enabled, roomId, categoryId, userId, resolveSocket])

  useVoteSocketEvents({
    resolveSocket,
    enabled,
    roomId,
    categoryId,
    dispatch,
    showToast,
    onTempCandidateClear: handleTempCandidateClear,
    onTempCandidateRemove: handleTempCandidateRemove,
  })

  const join = useCallback(() => {
    if (!enabled || !roomId || !categoryId) return

    const socket = resolveSocket()
    if (!socket) return

    if (joinRef.current.isJoined && joinRef.current.roomId === roomId && joinRef.current.categoryId === categoryId) return

    if (joinRef.current.isJoined && joinRef.current.roomId && joinRef.current.categoryId) {
      if (joinRef.current.roomId !== roomId || joinRef.current.categoryId !== categoryId) {
        socket.emit(VOTE_EVENTS.leave, {
          roomId: joinRef.current.roomId,
          categoryId: joinRef.current.categoryId,
          userId,
        })
        addSocketBreadcrumb('vote:leave', {
          roomId: joinRef.current.roomId,
          categoryId: joinRef.current.categoryId,
        })
      }
      joinRef.current = { ...initialJoinState }
      resetState()
    }

    joinRef.current.shouldJoin = true

    if (!socket.connected) {
      if (joinRef.current.isPending) return
      joinRef.current.isPending = true
      connectReal()
      return
    }

    if (joinRef.current.isJoined) return

    socket.emit(VOTE_EVENTS.join, { roomId, categoryId, userId })
    addSocketBreadcrumb('vote:join', { roomId })
    joinRef.current = { isJoined: true, roomId, categoryId, isPending: false, shouldJoin: false }
  }, [enabled, roomId, categoryId, userId, resolveSocket, connectReal, resetState])

  const leave = useCallback(
    (options?: { disconnect?: boolean }) => {
      const socket = resolveSocket()
      if (!socket) return

      const targetRoomId = joinRef.current.roomId ?? roomId
      const targetCategoryId = joinRef.current.categoryId ?? categoryId
      if (!targetRoomId || !targetCategoryId) return

      socket.emit(VOTE_EVENTS.leave, { roomId: targetRoomId, categoryId: targetCategoryId, userId })
      addSocketBreadcrumb('vote:leave', { roomId: targetRoomId, categoryId: targetCategoryId })
      joinRef.current = { ...initialJoinState }

      const shouldDisconnect = options?.disconnect !== false
      if (shouldDisconnect) {
        resetState()
        disconnectReal()
      }
    },
    [resolveSocket, roomId, categoryId, userId, disconnectReal, resetState],
  )

  // leaveRef: 언마운트 cleanup에서 항상 최신 leave 참조
  const leaveRef = useRef(leave)
  useEffect(() => {
    leaveRef.current = leave
  }, [leave])

  useEffect(() => {
    if (!enabled) return
    return () => {
      leaveRef.current({ disconnect: true })
    }
  }, [enabled])

  // [C->S] vote:candidate:add
  const addCandidate = useCallback(
    (input: Omit<VoteCandidateAddPayload, 'roomId' | 'categoryId'>) => {
      if (!enabled || !roomId || !categoryId) return

      const socket = resolveSocket()
      if (!socket) return

      if (stateRef.current.status === 'WAITING') {
        if (!tempCandidateIdsRef.current.has(input.placeId)) {
          const tempCandidate: VoteCandidate = {
            ...input,
            createdBy: userId,
            createdAt: new Date().toISOString(),
          }
          dispatch({ type: 'OPTIMISTIC_ADD_CANDIDATE', candidate: tempCandidate })
          if (!stateRef.current.candidates.some(c => c.placeId === input.placeId)) {
            tempCandidateIdsRef.current.add(input.placeId)
          }
        }
      }

      socket.emit(VOTE_EVENTS.addCandidate, { roomId, categoryId, ...input })
      addSocketBreadcrumb('vote:candidate:add', { roomId, placeId: input.placeId })
    },
    [enabled, roomId, categoryId, userId, resolveSocket],
  )

  // [C->S] vote:candidate:remove
  const removeCandidate = useCallback(
    (candidateId: string) => {
      if (!enabled || !roomId || !categoryId) return

      const socket = resolveSocket()
      if (!socket) return

      if (stateRef.current.status === 'WAITING') {
        if (!stateRef.current.candidates.some(c => c.placeId === candidateId)) return
        dispatch({ type: 'OPTIMISTIC_REMOVE_CANDIDATE', candidateId })
      }

      socket.emit(VOTE_EVENTS.removeCandidate, { roomId, categoryId, candidateId })
      addSocketBreadcrumb('vote:candidate:remove', { roomId, candidateId })
    },
    [enabled, roomId, categoryId, resolveSocket],
  )

  // [C->S] vote:start
  const startVote = useCallback(() => {
    if (!enabled || !roomId || !categoryId) return

    const socket = resolveSocket()
    if (!socket) return

    if (stateRef.current.status === 'WAITING') {
      dispatch({ type: 'OPTIMISTIC_START' })
    }

    socket.emit(VOTE_EVENTS.start, { roomId, categoryId })
    addSocketBreadcrumb('vote:start', { roomId })
  }, [enabled, roomId, categoryId, resolveSocket])

  // [C->S] vote:end
  const endVote = useCallback(() => {
    if (!enabled || !roomId || !categoryId) return

    const socket = resolveSocket()
    if (!socket) return

    socket.emit(VOTE_EVENTS.end, { roomId, categoryId })
    addSocketBreadcrumb('vote:end', { roomId })
  }, [enabled, roomId, categoryId, resolveSocket])

  // [C->S] vote:owner-select
  const ownerSelect = useCallback(
    (candidateId: string) => {
      if (!enabled || !roomId || !categoryId) return

      const socket = resolveSocket()
      if (!socket) return

      socket.emit(VOTE_EVENTS.ownerSelect, { roomId, categoryId, candidateId })
      addSocketBreadcrumb('vote:owner-select', { roomId, candidateId })
    },
    [enabled, roomId, categoryId, resolveSocket],
  )

  // [C->S] vote:reset
  const resetVote = useCallback(() => {
    if (!enabled || !roomId || !categoryId) return

    const socket = resolveSocket()
    if (!socket) return

    socket.emit(VOTE_EVENTS.reset, { roomId, categoryId })
    addSocketBreadcrumb('vote:reset', { roomId })
  }, [enabled, roomId, categoryId, resolveSocket])

  // [C->S] vote:cast
  const castVote = useCallback(
    (candidateId: string) => {
      if (!enabled || !roomId || !categoryId) return

      const socket = resolveSocket()
      if (!socket) return

      if (stateRef.current.status !== 'IN_PROGRESS') return
      if (stateRef.current.singleVote && stateRef.current.myVotes.length > 0) return

      dispatch({ type: 'OPTIMISTIC_CAST', candidateId, userId })
      socket.emit(VOTE_EVENTS.cast, { roomId, categoryId, candidateId })
      addSocketBreadcrumb('vote:cast', { roomId, candidateId })
    },
    [enabled, roomId, categoryId, userId, resolveSocket],
  )

  // [C->S] vote:revoke
  const revokeVote = useCallback(
    (candidateId: string) => {
      if (!enabled || !roomId || !categoryId) return

      const socket = resolveSocket()
      if (!socket) return

      if (stateRef.current.status !== 'IN_PROGRESS') return

      dispatch({ type: 'OPTIMISTIC_REVOKE', candidateId, userId })
      socket.emit(VOTE_EVENTS.revoke, { roomId, categoryId, candidateId })
      addSocketBreadcrumb('vote:revoke', { roomId, candidateId })
    },
    [enabled, roomId, categoryId, userId, resolveSocket],
  )

  // [C->S] vote:recast
  const recastVote = useCallback(
    (oldCandidateId: string, newCandidateId: string) => {
      if (!enabled || !roomId || !categoryId) return

      const socket = resolveSocket()
      if (!socket) return

      if (stateRef.current.status !== 'IN_PROGRESS') return

      dispatch({ type: 'OPTIMISTIC_RECAST', oldCandidateId, newCandidateId, userId })
      socket.emit(VOTE_EVENTS.recast, { roomId, categoryId, oldCandidateId, newCandidateId })
      addSocketBreadcrumb('vote:recast', { roomId, oldCandidateId, newCandidateId })
    },
    [enabled, roomId, categoryId, userId, resolveSocket],
  )

  const resetError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' })
  }, [])

  return {
    status: state.status,
    singleVote: state.singleVote,
    round: state.round,
    selectedCandidateId: state.selectedCandidateId,
    candidates: state.candidates,
    counts: state.counts,
    myVotes: state.myVotes,
    votersByCandidate: state.votersByCandidate,
    isConnected,
    error: state.error,
    join,
    leave,
    addCandidate,
    removeCandidate,
    startVote,
    endVote,
    resetVote,
    castVote,
    revokeVote,
    recastVote,
    ownerSelect,
    resetError,
  }
}
