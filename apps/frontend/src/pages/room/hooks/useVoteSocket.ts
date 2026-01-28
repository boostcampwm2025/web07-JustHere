import { useCallback, useEffect, useRef, useState } from 'react'
import { socketBaseUrl } from '@/shared/config/socket'
import { useSocketClient } from '@/shared/hooks'
import { VOTE_EVENTS } from '@/pages/room/constants'
import { createMockVoteSocket } from '@/pages/room/mocks'
import type {
  VoteCandidate,
  VoteCandidateAddPayload,
  VoteCandidateUpdatedPayload,
  VoteCountsUpdatedPayload,
  VoteEndedPayload,
  VoteErrorPayload,
  VoteMeUpdatedPayload,
  VoteStartedPayload,
  VoteStatePayload,
  VoteStatus,
  VoteSocketLike,
} from '@/pages/room/types'

interface UseVoteSocketOptions {
  roomId: string
  userId: string
  enabled?: boolean
  useMock?: boolean
}

const DEFAULT_STATUS: VoteStatus = 'WAITING'

export function useVoteSocket({ roomId, userId, enabled = true, useMock = false }: UseVoteSocketOptions) {
  const [status, setStatus] = useState<VoteStatus>(DEFAULT_STATUS)
  const [candidates, setCandidates] = useState<VoteCandidate[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [myVotes, setMyVotes] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<VoteErrorPayload | null>(null)

  const socketRef = useRef<VoteSocketLike | null>(null)
  const isJoinedRef = useRef(false)
  const joinedRoomIdRef = useRef<string | null>(null)
  const prevRoomIdRef = useRef(roomId)

  // 임시 후보자 ID 추적 (optimistic update용)
  const tempCandidateIdsRef = useRef<Set<string>>(new Set())

  const handleSocketError = useCallback((error: Error) => {
    setError({ code: 'SOCKET_ERROR', message: error.message })
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

  const resolveSocket = useCallback((): VoteSocketLike | null => {
    if (!enabled || !roomId) return null

    if (socketRef.current) return socketRef.current

    if (useMock) {
      const mock = createMockVoteSocket()
      mock.connect()
      socketRef.current = mock
      return mock
    }

    const socket = getSocket()
    if (!socket) return null

    socketRef.current = socket
    return socketRef.current
  }, [enabled, roomId, useMock, getSocket])

  const resetState = useCallback(() => {
    setStatus(DEFAULT_STATUS)
    setCandidates([])
    setCounts({})
    setMyVotes([])
    setError(null)
    tempCandidateIdsRef.current.clear()
  }, [])

  useEffect(() => {
    const prevRoomId = prevRoomIdRef.current
    prevRoomIdRef.current = roomId

    if (!enabled) return
    if (!isJoinedRef.current) return
    if (!socketRef.current) return
    if (prevRoomId === roomId) return

    const joinedRoomId = joinedRoomIdRef.current
    if (!joinedRoomId || joinedRoomId === roomId) return

    socketRef.current.emit(VOTE_EVENTS.leave, { roomId: joinedRoomId })
    isJoinedRef.current = false
    joinedRoomIdRef.current = null

    if (useMock) {
      socketRef.current.disconnect()
      socketRef.current = null
    } else {
      disconnectReal()
    }

    return () => {
      resetState()
    }
  }, [enabled, roomId, useMock, disconnectReal, resetState])

  useEffect(() => {
    if (!enabled) return

    const socket = resolveSocket()
    if (!socket) return

    const handleConnect = () => {
      setIsConnected(true)
    }

    const handleDisconnect = () => {
      setIsConnected(false)
    }

    // [S->C] vote:state - join 시 초기 상태 수신
    const handleState = (payload: VoteStatePayload) => {
      setStatus(payload.status)
      setCandidates(payload.candidates)
      setCounts(payload.counts)
      setMyVotes(payload.myVotes)
      setError(null)
      // 임시 후보자 제거
      tempCandidateIdsRef.current.clear()
    }

    // [S->C] vote:candidate:updated - 후보 추가/삭제 시 브로드캐스트
    const handleCandidateUpdated = (payload: VoteCandidateUpdatedPayload) => {
      const candidate = payload.candidate

      setCandidates(prev => {
        // placeId 기준으로 중복 체크
        const exists = prev.some(c => c.placeId === candidate.placeId)

        if (exists) {
          // 이미 존재하면 업데이트 (임시 후보자를 실제 후보로 교체)
          const tempIds = Array.from(tempCandidateIdsRef.current)
          const filtered = prev.filter(c => c.placeId !== candidate.placeId || !tempIds.includes(c.placeId))
          return [...filtered, candidate]
        } else {
          // 새로 추가 (임시 후보자 제거 후 추가)
          const tempIds = Array.from(tempCandidateIdsRef.current)
          const filtered = prev.filter(c => !tempIds.includes(c.placeId))
          return [...filtered, candidate]
        }
      })

      // counts 업데이트: 새 후보는 0으로 초기화, 기존 후보는 유지
      setCounts(prev => {
        const next = { ...prev }
        if (!next[candidate.placeId]) {
          next[candidate.placeId] = 0
        }
        return next
      })

      setError(null)
      tempCandidateIdsRef.current.delete(candidate.placeId)
    }

    // [S->C] vote:counts:updated - 투표/취소 시 브로드캐스트
    const handleCountsUpdated = (payload: VoteCountsUpdatedPayload) => {
      setCounts(prev => ({
        ...prev,
        [payload.candidateId]: payload.count,
      }))
    }

    // [S->C] vote:me:updated - 내 투표 변경 시 (변경된 경우에만)
    const handleMeUpdated = (payload: VoteMeUpdatedPayload) => {
      setMyVotes(payload.myVotes)
      setError(null)
    }

    // [S->C] vote:started - 투표 시작 시 브로드캐스트
    const handleStarted = (payload: VoteStartedPayload) => {
      setStatus(payload.status)
      setError(null)
    }

    // [S->C] vote:ended - 투표 종료 시 브로드캐스트
    const handleEnded = (payload: VoteEndedPayload) => {
      setStatus(payload.status)
      setCandidates(payload.candidates)
      setError(null)
    }

    // [S->C] vote:error - 에러 발생 시
    const handleError = (payload: VoteErrorPayload) => {
      setError(payload)
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on(VOTE_EVENTS.state, handleState)
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
      socket.off(VOTE_EVENTS.candidateUpdated, handleCandidateUpdated)
      socket.off(VOTE_EVENTS.countsUpdated, handleCountsUpdated)
      socket.off(VOTE_EVENTS.meUpdated, handleMeUpdated)
      socket.off(VOTE_EVENTS.started, handleStarted)
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
      socket.emit(VOTE_EVENTS.leave, { roomId: joinedRoomIdRef.current })
      isJoinedRef.current = false
      joinedRoomIdRef.current = null
      resetState()
    }

    setIsConnected(socket.connected)

    if (!useMock && !socket.connected) {
      connectReal()
    }

    if (isJoinedRef.current) return

    // [C->S] vote:join - roomId만 전송 (서버에서 userId는 세션에서 가져옴)
    socket.emit(VOTE_EVENTS.join, { roomId })
    isJoinedRef.current = true
    joinedRoomIdRef.current = roomId
  }, [enabled, roomId, useMock, resolveSocket, connectReal, resetState])

  const leave = useCallback(() => {
    const socket = socketRef.current
    if (!socket || !roomId) return

    // [C->S] vote:leave
    socket.emit(VOTE_EVENTS.leave, { roomId })
    isJoinedRef.current = false
    joinedRoomIdRef.current = null
    resetState()

    if (useMock) {
      socket.disconnect()
      socketRef.current = null
      return
    }

    disconnectReal()
  }, [roomId, useMock, disconnectReal, resetState])

  useEffect(() => {
    if (!enabled) return

    return () => {
      if (!isJoinedRef.current) return
      leave()
    }
  }, [enabled, leave])

  // [C->S] vote:candidate:add
  const addCandidate = useCallback(
    (input: Omit<VoteCandidateAddPayload, 'roomId'>) => {
      if (!enabled || !roomId) return

      const socket = resolveSocket()
      if (!socket) return

      // Optimistic update: 임시 후보자 추가
      if (status === 'WAITING') {
        const duplicated = candidates.some(c => c.placeId === input.placeId)
        if (!duplicated) {
          const tempCandidate: VoteCandidate = {
            ...input,
            createdBy: userId,
            createdAt: new Date().toISOString(),
          }

          tempCandidateIdsRef.current.add(input.placeId)
          setCandidates(prev => [...prev, tempCandidate])
          setCounts(prev => ({
            ...prev,
            [input.placeId]: 0,
          }))
          setError(null)
        }
      }

      // [C->S] vote:candidate:add 전송
      socket.emit(VOTE_EVENTS.addCandidate, {
        roomId,
        ...input,
      })
    },
    [enabled, roomId, userId, status, candidates, resolveSocket],
  )

  // [C->S] vote:candidate:remove
  const removeCandidate = useCallback(
    (candidateId: string) => {
      if (!enabled || !roomId) return

      const socket = resolveSocket()
      if (!socket) return

      // Optimistic update: 후보자 제거
      if (status === 'WAITING') {
        const exists = candidates.some(c => c.placeId === candidateId)
        if (exists) {
          setCandidates(prev => prev.filter(c => c.placeId !== candidateId))
          setCounts(prev => {
            const next = { ...prev }
            delete next[candidateId]
            return next
          })
          setMyVotes(prev => prev.filter(id => id !== candidateId))
          setError(null)
        }
      }

      // [C->S] vote:candidate:remove 전송
      socket.emit(VOTE_EVENTS.removeCandidate, {
        roomId,
        candidateId,
      })
    },
    [enabled, roomId, status, candidates, resolveSocket],
  )

  // [C->S] vote:start
  const startVote = useCallback(() => {
    if (!enabled || !roomId) return

    const socket = resolveSocket()
    if (!socket) return

    // Optimistic update
    if (status === 'WAITING') {
      setStatus('IN_PROGRESS')
      setError(null)
    }

    // [C->S] vote:start 전송
    socket.emit(VOTE_EVENTS.start, { roomId })
  }, [enabled, roomId, status, resolveSocket])

  // [C->S] vote:end
  const endVote = useCallback(() => {
    if (!enabled || !roomId) return

    const socket = resolveSocket()
    if (!socket) return

    // Optimistic update
    if (status === 'IN_PROGRESS') {
      setStatus('COMPLETED')
      setError(null)
    }

    // [C->S] vote:end 전송
    socket.emit(VOTE_EVENTS.end, { roomId })
  }, [enabled, roomId, status, resolveSocket])

  // [C->S] vote:cast
  const castVote = useCallback(
    (candidateId: string) => {
      if (!enabled || !roomId) return

      const socket = resolveSocket()
      if (!socket) return

      // Optimistic update
      if (status === 'IN_PROGRESS' && !myVotes.includes(candidateId)) {
        const currentCount = counts[candidateId] ?? 0
        setMyVotes(prev => [...prev, candidateId])
        setCounts(prev => ({
          ...prev,
          [candidateId]: currentCount + 1,
        }))
        setError(null)
      }

      // [C->S] vote:cast 전송
      socket.emit(VOTE_EVENTS.cast, {
        roomId,
        candidateId,
      })
    },
    [enabled, roomId, status, myVotes, counts, resolveSocket],
  )

  // [C->S] vote:revoke
  const revokeVote = useCallback(
    (candidateId: string) => {
      if (!enabled || !roomId) return

      const socket = resolveSocket()
      if (!socket) return

      // Optimistic update
      if (status === 'IN_PROGRESS' && myVotes.includes(candidateId)) {
        const currentCount = counts[candidateId] ?? 0
        setMyVotes(prev => prev.filter(id => id !== candidateId))
        setCounts(prev => ({
          ...prev,
          [candidateId]: Math.max(0, currentCount - 1),
        }))
        setError(null)
      }

      // [C->S] vote:revoke 전송
      socket.emit(VOTE_EVENTS.revoke, {
        roomId,
        candidateId,
      })
    },
    [enabled, roomId, status, myVotes, counts, resolveSocket],
  )

  const resetError = useCallback(() => {
    setError(null)
  }, [])

  return {
    status,
    candidates,
    counts,
    myVotes,
    isConnected,
    error,
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
