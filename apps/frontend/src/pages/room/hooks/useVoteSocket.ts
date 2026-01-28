import { useCallback, useEffect, useRef, useState } from 'react'
import { socketBaseUrl } from '@/shared/config/socket'
import { useSocketClient } from '@/shared/hooks'
import { addSocketBreadcrumb } from '@/shared/utils'
import { VOTE_EVENTS } from '@/pages/room/constants'
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
}

const DEFAULT_STATUS: VoteStatus = 'WAITING'

export function useVoteSocket({ roomId, userId, enabled = true }: UseVoteSocketOptions) {
  const [status, setStatus] = useState<VoteStatus>(DEFAULT_STATUS)
  const [candidates, setCandidates] = useState<VoteCandidate[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [myVotes, setMyVotes] = useState<string[]>([])
  const [votersByCandidate, setVotersByCandidate] = useState<Record<string, string[]>>({})
  const [error, setError] = useState<VoteErrorPayload | null>(null)

  const isJoinedRef = useRef(false)
  const joinedRoomIdRef = useRef<string | null>(null)
  const pendingJoinRef = useRef(false)
  const shouldJoinRef = useRef(false)
  const prevRoomIdRef = useRef(roomId)

  // 임시 후보자 ID 추적 (optimistic update용)
  const tempCandidateIdsRef = useRef<Set<string>>(new Set())

  const handleSocketError = useCallback((error: Error) => {
    setError({ code: 'SOCKET_ERROR', message: error.message })
  }, [])

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
    setStatus(DEFAULT_STATUS)
    setCandidates([])
    setCounts({})
    setMyVotes([])
    setVotersByCandidate({})
    setError(null)
    tempCandidateIdsRef.current.clear()
  }, [])

  // canvas가 변경될 때 이전 vote room에서 leave
  useEffect(() => {
    const prevRoomId = prevRoomIdRef.current
    prevRoomIdRef.current = roomId

    if (!enabled) return
    if (!isJoinedRef.current) return
    if (prevRoomId === roomId) return

    const joinedRoomId = joinedRoomIdRef.current
    if (!joinedRoomId || joinedRoomId === roomId) return

    const socket = resolveSocket()
    if (!socket) return

    // 이전 roomId의 vote room에서 leave
    socket.emit(VOTE_EVENTS.leave, { roomId: joinedRoomId })
    addSocketBreadcrumb('vote:leave', { roomId: joinedRoomId })
    isJoinedRef.current = false
    joinedRoomIdRef.current = null
    pendingJoinRef.current = false
    shouldJoinRef.current = false

    return () => {
      resetState()
    }
  }, [enabled, roomId, resolveSocket, resetState])

  useEffect(() => {
    if (!enabled) return

    const socket = resolveSocket()
    if (!socket) return

    const handleConnect = () => {
      addSocketBreadcrumb('vote:connect', { roomId })
      pendingJoinRef.current = false
      if (shouldJoinRef.current && !isJoinedRef.current) {
        socket.emit(VOTE_EVENTS.join, { roomId: roomId, userId })
        addSocketBreadcrumb('vote:join', { roomId })
        isJoinedRef.current = true
        joinedRoomIdRef.current = roomId
        shouldJoinRef.current = false
      }
    }

    const handleDisconnect = () => {
      addSocketBreadcrumb('vote:disconnect', { roomId })
    }

    // [S->C] vote:state - join 시 초기 상태 수신
    const handleState = (payload: VoteStatePayload) => {
      setStatus(payload.status)
      setCandidates(payload.candidates)
      setCounts(payload.counts)
      setMyVotes(payload.myVotes)
      setVotersByCandidate(payload.voters ?? {})
      setError(null)
      // 임시 후보자 제거
      tempCandidateIdsRef.current.clear()
      addSocketBreadcrumb('vote:state', { roomId, status: payload.status, candidatesCount: payload.candidates.length })
    }

    // [S->C] vote:candidate:updated - 후보 추가/삭제 시 브로드캐스트
    const handleCandidateUpdated = (payload: VoteCandidateUpdatedPayload) => {
      const candidate = payload.candidate

      setCandidates(prev => {
        // placeId 기준으로 항상 교체해 중복을 방지
        const filtered = prev.filter(c => c.placeId !== candidate.placeId)
        return [...filtered, candidate]
      })

      // counts 업데이트: 새 후보는 0으로 초기화, 기존 후보는 유지
      setCounts(prev => {
        const next = { ...prev }
        if (!next[candidate.placeId]) {
          next[candidate.placeId] = 0
        }
        return next
      })
      setVotersByCandidate(prev => {
        if (candidate.placeId in prev) return prev
        return { ...prev, [candidate.placeId]: [] }
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
      setVotersByCandidate(prev => ({
        ...prev,
        [payload.candidateId]: payload.voters,
      }))
      addSocketBreadcrumb('vote:counts:updated', { roomId, candidateId: payload.candidateId, count: payload.count })
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
      addSocketBreadcrumb('vote:started', { roomId })
    }

    // [S->C] vote:ended - 투표 종료 시 브로드캐스트
    const handleEnded = (payload: VoteEndedPayload) => {
      setStatus(payload.status)
      setCandidates(payload.candidates)
      setError(null)
      addSocketBreadcrumb('vote:ended', { roomId, candidatesCount: payload.candidates.length })
    }

    // [S->C] vote:error - 에러 발생 시
    const handleError = (payload: VoteErrorPayload) => {
      setError(payload)
      addSocketBreadcrumb('vote:error', { roomId, code: payload.code, message: payload.message }, 'error')
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
  }, [enabled, roomId, resolveSocket])

  const join = useCallback(() => {
    if (!enabled || !roomId) return

    const socket = resolveSocket()
    if (!socket) return

    // 이미 같은 roomId의 vote room에 join되어 있으면 스킵
    if (isJoinedRef.current && joinedRoomIdRef.current === roomId) return

    // 다른 roomId의 vote room에 join되어 있으면 먼저 leave
    if (isJoinedRef.current && joinedRoomIdRef.current && joinedRoomIdRef.current !== roomId) {
      socket.emit(VOTE_EVENTS.leave, { roomId: joinedRoomIdRef.current })
      addSocketBreadcrumb('vote:leave', { roomId: joinedRoomIdRef.current })
      isJoinedRef.current = false
      joinedRoomIdRef.current = null
      resetState()
    }

    shouldJoinRef.current = true

    if (!socket.connected) {
      if (pendingJoinRef.current) return
      pendingJoinRef.current = true
      connectReal()
      return
    }

    if (isJoinedRef.current) return

    // [C->S] vote:join
    socket.emit(VOTE_EVENTS.join, { roomId: roomId, userId })
    addSocketBreadcrumb('vote:join', { roomId })
    isJoinedRef.current = true
    joinedRoomIdRef.current = roomId
    shouldJoinRef.current = false
  }, [enabled, roomId, userId, resolveSocket, connectReal, resetState])

  const leave = useCallback(() => {
    const socket = resolveSocket()
    if (!socket || !roomId) return

    // [C->S] vote:leave
    socket.emit(VOTE_EVENTS.leave, { roomId: roomId })
    addSocketBreadcrumb('vote:leave', { roomId })
    isJoinedRef.current = false
    joinedRoomIdRef.current = null
    pendingJoinRef.current = false
    shouldJoinRef.current = false
    resetState()

    disconnectReal()
  }, [resolveSocket, roomId, disconnectReal, resetState])

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
          setVotersByCandidate(prev => ({
            ...prev,
            [input.placeId]: [],
          }))
          setError(null)
        }
      }

      socket.emit(VOTE_EVENTS.addCandidate, {
        roomId,
        ...input,
      })
      addSocketBreadcrumb('vote:candidate:add', { roomId, placeId: input.placeId })
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
          setVotersByCandidate(prev => {
            const next = { ...prev }
            delete next[candidateId]
            return next
          })
          setMyVotes(prev => prev.filter(id => id !== candidateId))
          setError(null)
        }
      }

      socket.emit(VOTE_EVENTS.removeCandidate, {
        roomId,
        candidateId,
      })
      addSocketBreadcrumb('vote:candidate:remove', { roomId, candidateId })
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

    socket.emit(VOTE_EVENTS.start, { roomId: roomId })
    addSocketBreadcrumb('vote:start', { roomId })
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

    socket.emit(VOTE_EVENTS.end, { roomId: roomId })
    addSocketBreadcrumb('vote:end', { roomId })
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

      socket.emit(VOTE_EVENTS.cast, {
        roomId,
        candidateId,
      })
      addSocketBreadcrumb('vote:cast', { roomId, candidateId })
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

      socket.emit(VOTE_EVENTS.revoke, {
        roomId,
        candidateId,
      })
      addSocketBreadcrumb('vote:revoke', { roomId, candidateId })
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
    votersByCandidate,
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
