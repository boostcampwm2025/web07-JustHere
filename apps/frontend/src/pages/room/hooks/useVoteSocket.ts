import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { socketBaseUrl } from '@/shared/config/socket'
import { useSocketClient } from '@/shared/hooks'
import {
  VOTE_EVENTS,
  createMockVoteSocket,
  type VoteEventName,
  type VoteAddCandidatePayload,
  type VoteCandidate,
  type VoteCandidateUpdatedPayload,
  type VoteCountsUpdatedPayload,
  type VoteEndedPayload,
  type VoteError,
  type VoteMeUpdatedPayload,
  type VoteRemoveCandidatePayload,
  type VoteRoomActionPayload,
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
  addCandidate: (input: Omit<VoteAddCandidatePayload, 'roomId'>) => void
  removeCandidate: (candidateId: string) => void
  startVote: () => void
  endVote: () => void
  castVote: (candidateId: string) => void
  revokeVote: (candidateId: string) => void
  resetError: () => void
}

type PendingAction = {
  snapshot: VoteState
  type: string
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

function createActionId(): string {
  const random = Math.random().toString(36).slice(2, 8)
  return `vote-${Date.now()}-${random}`
}

export function useVoteSocket({ roomId, userId, isOwner = false, enabled = true, useMock = false }: UseVoteSocketOptions): UseVoteSocketResult {
  const [state, setState] = useState<VoteState>(() => createInitialState(roomId, isOwner))

  const socketRef = useRef<VoteSocketLike | null>(null)
  const isJoinedRef = useRef(false)
  const joinedRoomIdRef = useRef<string | null>(null)
  const prevRoomIdRef = useRef(roomId)
  const pendingActionsRef = useRef<Map<string, PendingAction>>(new Map())

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

  const clearPendingActions = useCallback(() => {
    pendingActionsRef.current.clear()
  }, [])

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

  const applyOptimistic = useCallback((actionId: string, type: string, updater: (prev: VoteState) => VoteState) => {
    setState(prev => {
      pendingActionsRef.current.set(actionId, { snapshot: prev, type })
      return updater(prev)
    })
  }, [])

  const rollbackAction = useCallback((actionId: string | undefined, error: VoteError) => {
    if (!actionId) {
      setState(prev => ({
        ...prev,
        lastError: error,
      }))
      return
    }

    const pending = pendingActionsRef.current.get(actionId)
    pendingActionsRef.current.delete(actionId)

    if (!pending) {
      setState(prev => ({
        ...prev,
        lastError: error,
      }))
      return
    }

    setState({
      ...pending.snapshot,
      lastError: error,
    })
  }, [])

  const emitWithAction = useCallback(
    <TPayload extends object>(event: VoteEventName, payload: TPayload, type: string, updater: (prev: VoteState) => VoteState) => {
      if (!enabled || !roomId) return

      const socket = resolveSocket()
      if (!socket) return

      const actionId = createActionId()
      const nextPayload = { ...payload, actionId } as TPayload & { actionId: string }

      applyOptimistic(actionId, type, updater)
      socket.emit(event, nextPayload)
    },
    [enabled, roomId, resolveSocket, applyOptimistic],
  )

  useEffect(() => {
    const prevRoomId = prevRoomIdRef.current
    prevRoomIdRef.current = roomId

    if (!enabled) return
    if (!isJoinedRef.current) return
    if (!socketRef.current) return
    if (prevRoomId === roomId) return

    const joinedRoomId = joinedRoomIdRef.current
    if (!joinedRoomId || joinedRoomId === roomId) return

    socketRef.current.emit(VOTE_EVENTS.leave, { roomId: joinedRoomId, userId })
    isJoinedRef.current = false
    joinedRoomIdRef.current = null
    clearPendingActions()

    if (useMock) {
      socketRef.current.disconnect()
      socketRef.current = null
      return
    }

    disconnectReal()
  }, [enabled, roomId, userId, useMock, disconnectReal, clearPendingActions])

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
      clearPendingActions()
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
      clearPendingActions()
      setState(prev => ({
        ...prev,
        roomId: payload.roomId,
        status: payload.status,
      }))
    }

    const handleCandidateUpdated = (payload: VoteCandidateUpdatedPayload) => {
      clearPendingActions()
      setState(prev => {
        if (payload.action === 'add' && payload.candidate) {
          const tempCandidates = prev.candidates.filter(
            candidate => candidate.placeId === payload.candidate?.placeId && candidate.id.startsWith('temp-candidate-'),
          )
          const tempCandidateIds = new Set(tempCandidates.map(candidate => candidate.id))

          const baseCandidates = prev.candidates.filter(candidate => !tempCandidateIds.has(candidate.id))
          const exists = baseCandidates.some(candidate => candidate.id === payload.candidate?.id)
          if (exists) return prev

          const nextCounts = { ...prev.counts }
          tempCandidateIds.forEach(id => {
            delete nextCounts[id]
          })

          return {
            ...prev,
            candidates: [...baseCandidates, payload.candidate],
            counts: { ...nextCounts, [payload.candidate.id]: nextCounts[payload.candidate.id] ?? 0 },
            lastError: null,
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
            lastError: null,
          }
        }

        return prev
      })
    }

    const handleCountsUpdated = (payload: VoteCountsUpdatedPayload) => {
      clearPendingActions()
      setState(prev => ({
        ...prev,
        counts: {
          ...prev.counts,
          [payload.candidateId]: payload.count,
        },
      }))
    }

    const handleMeUpdated = (payload: VoteMeUpdatedPayload) => {
      clearPendingActions()
      setState(prev => ({
        ...prev,
        myVotes: payload.myVotes,
        lastError: null,
      }))
    }

    const handleStarted = (payload: VoteStartedPayload) => {
      clearPendingActions()
      setState(prev => ({
        ...prev,
        roomId: payload.roomId,
        status: payload.status,
        lastError: null,
      }))
    }

    const handleEnded = (payload: VoteEndedPayload) => {
      clearPendingActions()
      setState(prev => ({
        ...prev,
        roomId: payload.roomId,
        status: payload.status,
        lastError: null,
      }))
    }

    const handleError = (payload: VoteError) => {
      rollbackAction(payload.actionId, payload)
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on(VOTE_EVENTS.state, handleState)
    socket.on(VOTE_EVENTS.statusChanged, handleStatusChanged)
    socket.on(VOTE_EVENTS.candidateUpdated, handleCandidateUpdated)
    socket.on(VOTE_EVENTS.countsUpdated, handleCountsUpdated)
    socket.on(VOTE_EVENTS.meUpdated, handleMeUpdated)
    socket.on(VOTE_EVENTS.started, handleStarted)
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
      socket.off(VOTE_EVENTS.ended, handleEnded)
      socket.off(VOTE_EVENTS.error, handleError)
    }
  }, [enabled, resolveSocket, rollbackAction, clearPendingActions])

  const join = useCallback(() => {
    if (!enabled || !roomId) return

    const socket = resolveSocket()
    if (!socket) return

    if (isJoinedRef.current && joinedRoomIdRef.current === roomId) return

    if (isJoinedRef.current && joinedRoomIdRef.current && joinedRoomIdRef.current !== roomId) {
      socket.emit(VOTE_EVENTS.leave, { roomId: joinedRoomIdRef.current, userId })
      isJoinedRef.current = false
      joinedRoomIdRef.current = null
      clearPendingActions()
    }

    const nextInitial = createInitialState(roomId, isOwner)
    nextInitial.isConnected = socket.connected
    setState(nextInitial)

    if (!useMock && !socket.connected) {
      connectReal()
    }

    if (isJoinedRef.current) return

    socket.emit(VOTE_EVENTS.join, { roomId, userId, isOwner })
    isJoinedRef.current = true
    joinedRoomIdRef.current = roomId
  }, [enabled, roomId, userId, isOwner, useMock, resolveSocket, connectReal, clearPendingActions])

  const leave = useCallback(() => {
    const socket = socketRef.current
    if (!socket || !roomId) return

    socket.emit(VOTE_EVENTS.leave, { roomId, userId })
    isJoinedRef.current = false
    joinedRoomIdRef.current = null
    clearPendingActions()

    if (useMock) {
      socket.disconnect()
      socketRef.current = null
      setState(createInitialState(roomId, isOwner))
      return
    }

    disconnectReal()
    setState(createInitialState(roomId, isOwner))
  }, [roomId, userId, useMock, disconnectReal, isOwner, clearPendingActions])

  useEffect(() => {
    if (!enabled) return

    return () => {
      if (!isJoinedRef.current) return
      leave()
    }
  }, [enabled, leave])

  const addCandidate = useCallback(
    (input: Omit<VoteAddCandidatePayload, 'roomId'>) => {
      const tempActionId = createActionId()
      const tempId = `temp-candidate-${tempActionId}`

      const optimisticCandidate: VoteCandidate = {
        id: tempId,
        placeId: input.placeId,
        name: input.name,
        address: input.address,
        category: input.category,
        createdBy: userId,
        createdAt: new Date().toISOString(),
      }

      emitWithAction(
        VOTE_EVENTS.addCandidate,
        {
          roomId,
          ...input,
        },
        'addCandidate',
        prev => {
          if (prev.status !== 'WAITING') return prev
          const duplicated = prev.candidates.some(candidate => candidate.placeId === input.placeId)
          if (duplicated) return prev

          return {
            ...prev,
            candidates: [...prev.candidates, optimisticCandidate],
            counts: {
              ...prev.counts,
              [optimisticCandidate.id]: prev.counts[optimisticCandidate.id] ?? 0,
            },
            lastError: null,
          }
        },
      )
    },
    [emitWithAction, roomId, userId],
  )

  const removeCandidate = useCallback(
    (candidateId: string) => {
      const payload: VoteRemoveCandidatePayload = {
        roomId,
        candidateId,
      }

      emitWithAction(VOTE_EVENTS.removeCandidate, payload, 'removeCandidate', prev => {
        if (prev.status !== 'WAITING') return prev
        const exists = prev.candidates.some(candidate => candidate.id === candidateId)
        if (!exists) return prev

        const nextCandidates = prev.candidates.filter(candidate => candidate.id !== candidateId)
        const nextCounts = { ...prev.counts }
        delete nextCounts[candidateId]
        const nextMyVotes = prev.myVotes.filter(id => id !== candidateId)

        return {
          ...prev,
          candidates: nextCandidates,
          counts: nextCounts,
          myVotes: nextMyVotes,
          lastError: null,
        }
      })
    },
    [emitWithAction, roomId],
  )

  const startVote = useCallback(() => {
    if (!isOwner) {
      setState(prev => ({
        ...prev,
        lastError: {
          code: 'NOT_OWNER',
          message: '방장 권한이 필요합니다.',
        },
      }))
      return
    }

    const payload: VoteRoomActionPayload = { roomId }

    emitWithAction(VOTE_EVENTS.start, payload, 'startVote', prev => {
      if (prev.status !== 'WAITING') return prev
      return {
        ...prev,
        status: 'IN_PROGRESS',
        lastError: null,
      }
    })
  }, [emitWithAction, roomId, isOwner])

  const endVote = useCallback(() => {
    if (!isOwner) {
      setState(prev => ({
        ...prev,
        lastError: {
          code: 'NOT_OWNER',
          message: '방장 권한이 필요합니다.',
        },
      }))
      return
    }

    const payload: VoteRoomActionPayload = { roomId }

    emitWithAction(VOTE_EVENTS.end, payload, 'endVote', prev => {
      if (prev.status !== 'IN_PROGRESS') return prev
      return {
        ...prev,
        status: 'COMPLETED',
        lastError: null,
      }
    })
  }, [emitWithAction, roomId, isOwner])

  const castVote = useCallback(
    (candidateId: string) => {
      emitWithAction(
        VOTE_EVENTS.cast,
        {
          roomId,
          candidateId,
        },
        'castVote',
        prev => {
          if (prev.status !== 'IN_PROGRESS') return prev
          if (prev.myVotes.includes(candidateId)) return prev

          const currentCount = prev.counts[candidateId] ?? 0

          return {
            ...prev,
            myVotes: [...prev.myVotes, candidateId],
            counts: {
              ...prev.counts,
              [candidateId]: currentCount + 1,
            },
            lastError: null,
          }
        },
      )
    },
    [emitWithAction, roomId],
  )

  const revokeVote = useCallback(
    (candidateId: string) => {
      emitWithAction(
        VOTE_EVENTS.revoke,
        {
          roomId,
          candidateId,
        },
        'revokeVote',
        prev => {
          if (prev.status !== 'IN_PROGRESS') return prev
          if (!prev.myVotes.includes(candidateId)) return prev

          const currentCount = prev.counts[candidateId] ?? 0

          return {
            ...prev,
            myVotes: prev.myVotes.filter(id => id !== candidateId),
            counts: {
              ...prev.counts,
              [candidateId]: Math.max(0, currentCount - 1),
            },
            lastError: null,
          }
        },
      )
    },
    [emitWithAction, roomId],
  )

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
    addCandidate,
    removeCandidate,
    startVote,
    endVote,
    castVote,
    revokeVote,
    resetError,
  }
}
