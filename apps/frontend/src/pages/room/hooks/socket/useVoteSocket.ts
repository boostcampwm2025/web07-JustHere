import { useCallback, useEffect, useRef, useState } from 'react'
import { socketBaseUrl } from '@/shared/config/socket'
import { useSocketClient, useToast } from '@/shared/hooks'
import { addSocketBreadcrumb } from '@/shared/utils'
import { VOTE_EVENTS } from '@/pages/room/constants'
import type {
  VoteCandidate,
  VoteCandidateAddPayload,
  VoteCandidateAddedPayload,
  VoteCandidateRemovedPayload,
  VoteCountsUpdatedPayload,
  VoteEndedPayload,
  VoteErrorPayload,
  VoteMeUpdatedPayload,
  VoteResettedPayload,
  VoteStartedPayload,
  VoteStatePayload,
  VoteStatus,
  VoteSocketLike,
} from '@/pages/room/types'

interface UseVoteSocketOptions {
  roomId: string
  categoryId: string
  userId: string
  enabled?: boolean
}

const DEFAULT_STATUS: VoteStatus = 'WAITING'

export function useVoteSocket({ roomId, categoryId, userId, enabled = true }: UseVoteSocketOptions) {
  const { showToast } = useToast()
  const [status, setStatus] = useState<VoteStatus>(DEFAULT_STATUS)
  const [candidates, setCandidates] = useState<VoteCandidate[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [myVotes, setMyVotes] = useState<string[]>([])
  const [votersByCandidate, setVotersByCandidate] = useState<Record<string, string[]>>({})
  const [error, setError] = useState<VoteErrorPayload | null>(null)

  const candidatesRef = useRef<VoteCandidate[]>([])
  const countsRef = useRef<Record<string, number>>({})
  const myVotesRef = useRef<string[]>([])
  const votersByCandidateRef = useRef<Record<string, string[]>>({})

  const isJoinedRef = useRef(false)
  const joinedRoomIdRef = useRef<string | null>(null)
  const joinedCategoryIdRef = useRef<string | null>(null)
  const pendingJoinRef = useRef(false)
  const shouldJoinRef = useRef(false)
  const prevRoomIdRef = useRef(roomId)
  const prevCategoryIdRef = useRef(categoryId)

  // 임시 후보자 ID 추적 (optimistic update용)
  const tempCandidateIdsRef = useRef<Set<string>>(new Set())

  const handleSocketError = useCallback((error: Error) => {
    setError({
      status: 'ERROR',
      statusCode: 0,
      errorType: 'SOCKET_ERROR',
      message: error.message,
      timestamp: new Date().toISOString(),
    })
    pendingJoinRef.current = false
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
    candidatesRef.current = []
    countsRef.current = {}
    myVotesRef.current = []
    votersByCandidateRef.current = {}
    setError(null)
    tempCandidateIdsRef.current.clear()
  }, [])

  useEffect(() => {
    candidatesRef.current = candidates
  }, [candidates])

  useEffect(() => {
    countsRef.current = counts
  }, [counts])

  useEffect(() => {
    myVotesRef.current = myVotes
  }, [myVotes])

  useEffect(() => {
    votersByCandidateRef.current = votersByCandidate
  }, [votersByCandidate])

  // room/category가 변경될 때 이전 vote room에서 leave
  useEffect(() => {
    const prevRoomId = prevRoomIdRef.current
    const prevCategoryId = prevCategoryIdRef.current
    prevRoomIdRef.current = roomId
    prevCategoryIdRef.current = categoryId

    if (!enabled) return
    if (!isJoinedRef.current) return
    if (prevRoomId === roomId && prevCategoryId === categoryId) return

    const joinedRoomId = joinedRoomIdRef.current
    const joinedCategoryId = joinedCategoryIdRef.current
    if (!joinedRoomId || !joinedCategoryId) return
    if (joinedRoomId === roomId && joinedCategoryId === categoryId) return

    const socket = resolveSocket()
    if (!socket) return

    // 이전 room/category의 vote room에서 leave
    socket.emit(VOTE_EVENTS.leave, { roomId: joinedRoomId, categoryId: joinedCategoryId, userId })
    addSocketBreadcrumb('vote:leave', { roomId: joinedRoomId, categoryId: joinedCategoryId })
    isJoinedRef.current = false
    joinedRoomIdRef.current = null
    joinedCategoryIdRef.current = null
    pendingJoinRef.current = false
    shouldJoinRef.current = false
    // 카테고리 변경 시 state는 유지 → vote:state 수신 시 덮어씌움 (등록된 후보 없음 플래시 방지)
  }, [enabled, roomId, categoryId, userId, resolveSocket])

  useEffect(() => {
    if (!enabled) return

    const socket = resolveSocket()
    if (!socket) return

    const handleConnect = () => {
      addSocketBreadcrumb('vote:connect', { roomId })
      pendingJoinRef.current = false
      if (shouldJoinRef.current && !isJoinedRef.current && categoryId) {
        socket.emit(VOTE_EVENTS.join, { roomId: roomId, categoryId, userId })
        addSocketBreadcrumb('vote:join', { roomId })
        isJoinedRef.current = true
        joinedRoomIdRef.current = roomId
        joinedCategoryIdRef.current = categoryId
        shouldJoinRef.current = false
      }
    }

    const handleDisconnect = () => {
      addSocketBreadcrumb('vote:disconnect', { roomId })
      if (isJoinedRef.current) {
        isJoinedRef.current = false
        joinedRoomIdRef.current = null
        joinedCategoryIdRef.current = null
        shouldJoinRef.current = true
      }
      pendingJoinRef.current = false
    }

    // [S->C] vote:state - join 시 초기 상태 수신
    const handleState = (payload: VoteStatePayload) => {
      setStatus(payload.status)
      setCandidates(payload.candidates)
      setCounts(payload.counts)
      setMyVotes(payload.myVotes)
      setVotersByCandidate(payload.voters ?? {})
      countsRef.current = payload.counts
      myVotesRef.current = payload.myVotes
      votersByCandidateRef.current = payload.voters ?? {}
      setError(null)
      // 임시 후보자 제거
      tempCandidateIdsRef.current.clear()
      addSocketBreadcrumb('vote:state', { roomId, status: payload.status, candidatesCount: payload.candidates.length })
    }

    // [S->C] vote:candidate:added
    const handleCandidateAdded = (payload: VoteCandidateAddedPayload) => {
      const { candidate } = payload

      setCandidates(prev => {
        const filtered = prev.filter(c => c.placeId !== candidate.placeId)
        return [...filtered, candidate]
      })
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

    // [S->C] vote:candidate:removed
    const handleCandidateRemoved = (payload: VoteCandidateRemovedPayload) => {
      const { candidate } = payload

      setCandidates(prev => prev.filter(c => c.placeId !== candidate.placeId))
      setCounts(prev => {
        const next = { ...prev }
        delete next[candidate.placeId]
        return next
      })
      setVotersByCandidate(prev => {
        const next = { ...prev }
        delete next[candidate.placeId]
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
      showToast('투표가 시작되었습니다!', 'success')
    }

    // [S->C] vote:ended - 투표 종료 시 브로드캐스트
    const handleEnded = (payload: VoteEndedPayload) => {
      setStatus(payload.status)
      setCandidates(payload.candidates)
      setError(null)
      addSocketBreadcrumb('vote:ended', { roomId, candidatesCount: payload.candidates.length })
    }

    // [S->C] vote:resetted - 투표 리셋 시 브로드캐스트
    const handleResetted = (payload: VoteResettedPayload) => {
      setStatus(payload.status)
      setCandidates(payload.candidates)
      setCounts(payload.counts)
      setMyVotes([])
      setVotersByCandidate(payload.voters)
      countsRef.current = payload.counts
      myVotesRef.current = []
      votersByCandidateRef.current = payload.voters
      setError(null)
      addSocketBreadcrumb('vote:resetted', { roomId, candidatesCount: payload.candidates.length })
    }

    // [S->C] vote:error - 에러 발생 시
    const handleError = (payload: VoteErrorPayload) => {
      setError(payload)
      addSocketBreadcrumb('vote:error', { roomId, code: payload.errorType, message: payload.message }, 'error')
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on(VOTE_EVENTS.state, handleState)
    socket.on(VOTE_EVENTS.candidateAdded, handleCandidateAdded)
    socket.on(VOTE_EVENTS.candidateRemoved, handleCandidateRemoved)
    socket.on(VOTE_EVENTS.countsUpdated, handleCountsUpdated)
    socket.on(VOTE_EVENTS.meUpdated, handleMeUpdated)
    socket.on(VOTE_EVENTS.started, handleStarted)
    socket.on(VOTE_EVENTS.ended, handleEnded)
    socket.on(VOTE_EVENTS.resetted, handleResetted)
    socket.on(VOTE_EVENTS.error, handleError)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off(VOTE_EVENTS.state, handleState)
      socket.off(VOTE_EVENTS.candidateAdded, handleCandidateAdded)
      socket.off(VOTE_EVENTS.candidateRemoved, handleCandidateRemoved)
      socket.off(VOTE_EVENTS.countsUpdated, handleCountsUpdated)
      socket.off(VOTE_EVENTS.meUpdated, handleMeUpdated)
      socket.off(VOTE_EVENTS.started, handleStarted)
      socket.off(VOTE_EVENTS.ended, handleEnded)
      socket.off(VOTE_EVENTS.resetted, handleResetted)
      socket.off(VOTE_EVENTS.error, handleError)
    }
  }, [enabled, roomId, categoryId, userId, resolveSocket, showToast])

  const join = useCallback(() => {
    if (!enabled || !roomId || !categoryId) return

    const socket = resolveSocket()
    if (!socket) return

    // 이미 같은 roomId의 vote room에 join되어 있으면 스킵
    if (isJoinedRef.current && joinedRoomIdRef.current === roomId && joinedCategoryIdRef.current === categoryId) return

    // 다른 roomId의 vote room에 join되어 있으면 먼저 leave
    if (isJoinedRef.current && joinedRoomIdRef.current && joinedCategoryIdRef.current) {
      if (joinedRoomIdRef.current !== roomId || joinedCategoryIdRef.current !== categoryId) {
        socket.emit(VOTE_EVENTS.leave, {
          roomId: joinedRoomIdRef.current,
          categoryId: joinedCategoryIdRef.current,
          userId,
        })
        addSocketBreadcrumb('vote:leave', { roomId: joinedRoomIdRef.current, categoryId: joinedCategoryIdRef.current })
      }
      isJoinedRef.current = false
      joinedRoomIdRef.current = null
      joinedCategoryIdRef.current = null
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
    socket.emit(VOTE_EVENTS.join, { roomId: roomId, categoryId, userId })
    addSocketBreadcrumb('vote:join', { roomId })
    isJoinedRef.current = true
    joinedRoomIdRef.current = roomId
    joinedCategoryIdRef.current = categoryId
    shouldJoinRef.current = false
  }, [enabled, roomId, categoryId, userId, resolveSocket, connectReal, resetState])

  const leave = useCallback(
    (options?: { disconnect?: boolean }) => {
      const socket = resolveSocket()
      if (!socket) return

      const targetRoomId = joinedRoomIdRef.current ?? roomId
      const targetCategoryId = joinedCategoryIdRef.current ?? categoryId
      if (!targetRoomId || !targetCategoryId) return

      // [C->S] vote:leave
      socket.emit(VOTE_EVENTS.leave, { roomId: targetRoomId, categoryId: targetCategoryId, userId })
      addSocketBreadcrumb('vote:leave', { roomId: targetRoomId, categoryId: targetCategoryId })
      isJoinedRef.current = false
      joinedRoomIdRef.current = null
      joinedCategoryIdRef.current = null
      pendingJoinRef.current = false
      shouldJoinRef.current = false

      // 카테고리만 바꿀 때(disconnect: false)는 state 유지
      // 페이지 이탈 시에만 초기화
      const shouldDisconnect = options?.disconnect !== false
      if (shouldDisconnect) {
        resetState()
        disconnectReal()
      }
    },
    [resolveSocket, roomId, categoryId, userId, disconnectReal, resetState],
  )

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

      // Optimistic update: 임시 후보자 추가
      if (status === 'WAITING') {
        if (!tempCandidateIdsRef.current.has(input.placeId)) {
          const tempCandidate: VoteCandidate = {
            ...input,
            createdBy: userId,
            createdAt: new Date().toISOString(),
          }

          let didAdd = false
          setCandidates(prev => {
            const duplicated = prev.some(c => c.placeId === input.placeId)
            if (duplicated) return prev
            didAdd = true
            return [...prev, tempCandidate]
          })

          if (didAdd) {
            tempCandidateIdsRef.current.add(input.placeId)
            setCounts(prev => {
              if (prev[input.placeId] !== undefined) return prev
              return { ...prev, [input.placeId]: 0 }
            })
            setVotersByCandidate(prev => {
              if (prev[input.placeId]) return prev
              return { ...prev, [input.placeId]: [] }
            })
            setError(null)
          }
        }
      }

      socket.emit(VOTE_EVENTS.addCandidate, {
        roomId,
        categoryId,
        ...input,
      })
      addSocketBreadcrumb('vote:candidate:add', { roomId, placeId: input.placeId })
    },
    [enabled, roomId, categoryId, userId, status, resolveSocket],
  )

  // [C->S] vote:candidate:remove
  const removeCandidate = useCallback(
    (candidateId: string) => {
      if (!enabled || !roomId || !categoryId) return

      const socket = resolveSocket()
      if (!socket) return

      // Optimistic update: 후보자 제거
      if (status === 'WAITING') {
        if (!candidatesRef.current.some(c => c.placeId === candidateId)) return

        candidatesRef.current = candidatesRef.current.filter(c => c.placeId !== candidateId)
        setCandidates(prev => prev.filter(c => c.placeId !== candidateId))

        countsRef.current = Object.fromEntries(Object.entries(countsRef.current).filter(([id]) => id !== candidateId))
        setCounts(prev => {
          const next = { ...prev }
          delete next[candidateId]
          return next
        })

        votersByCandidateRef.current = Object.fromEntries(Object.entries(votersByCandidateRef.current).filter(([id]) => id !== candidateId))
        setVotersByCandidate(prev => {
          const next = { ...prev }
          delete next[candidateId]
          return next
        })

        myVotesRef.current = myVotesRef.current.filter(id => id !== candidateId)
        setMyVotes(prev => prev.filter(id => id !== candidateId))
        setError(null)
      }

      socket.emit(VOTE_EVENTS.removeCandidate, {
        roomId,
        categoryId,
        candidateId,
      })
      addSocketBreadcrumb('vote:candidate:remove', { roomId, candidateId })
    },
    [enabled, roomId, categoryId, status, resolveSocket],
  )

  // [C->S] vote:start
  const startVote = useCallback(() => {
    if (!enabled || !roomId || !categoryId) return

    const socket = resolveSocket()
    if (!socket) return

    // Optimistic update
    if (status === 'WAITING') {
      setStatus('IN_PROGRESS')
      setError(null)
    }

    socket.emit(VOTE_EVENTS.start, { roomId: roomId, categoryId })
    addSocketBreadcrumb('vote:start', { roomId })
  }, [enabled, roomId, categoryId, status, resolveSocket])

  // [C->S] vote:end
  const endVote = useCallback(() => {
    if (!enabled || !roomId || !categoryId) return

    const socket = resolveSocket()
    if (!socket) return

    socket.emit(VOTE_EVENTS.end, { roomId: roomId, categoryId })
    addSocketBreadcrumb('vote:end', { roomId })
  }, [enabled, roomId, categoryId, resolveSocket])

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

      // Optimistic update
      if (status !== 'IN_PROGRESS') return
      if (myVotesRef.current.includes(candidateId)) return

      const nextMyVotes = [...myVotesRef.current, candidateId]
      myVotesRef.current = nextMyVotes
      setMyVotes(prev => (prev.includes(candidateId) ? prev : [...prev, candidateId]))

      const currentCount = countsRef.current[candidateId] ?? 0
      const nextCount = currentCount + 1
      countsRef.current = { ...countsRef.current, [candidateId]: nextCount }
      setCounts(prev => ({
        ...prev,
        [candidateId]: (prev[candidateId] ?? 0) + 1,
      }))

      const currentVoters = votersByCandidateRef.current[candidateId] ?? []
      if (!currentVoters.includes(userId)) {
        const nextVoters = [...currentVoters, userId]
        votersByCandidateRef.current = { ...votersByCandidateRef.current, [candidateId]: nextVoters }
        setVotersByCandidate(prev => {
          const existing = prev[candidateId] ?? []
          if (existing.includes(userId)) return prev
          return { ...prev, [candidateId]: [...existing, userId] }
        })
      }

      setError(null)

      socket.emit(VOTE_EVENTS.cast, {
        roomId,
        categoryId,
        candidateId,
      })
      addSocketBreadcrumb('vote:cast', { roomId, candidateId })
    },
    [enabled, roomId, categoryId, userId, status, resolveSocket],
  )

  // [C->S] vote:revoke
  const revokeVote = useCallback(
    (candidateId: string) => {
      if (!enabled || !roomId || !categoryId) return

      const socket = resolveSocket()
      if (!socket) return

      // Optimistic update
      if (status !== 'IN_PROGRESS') return
      if (!myVotesRef.current.includes(candidateId)) return

      const nextMyVotes = myVotesRef.current.filter(id => id !== candidateId)
      myVotesRef.current = nextMyVotes
      setMyVotes(prev => prev.filter(id => id !== candidateId))

      const currentCount = countsRef.current[candidateId] ?? 0
      const nextCount = Math.max(0, currentCount - 1)
      countsRef.current = { ...countsRef.current, [candidateId]: nextCount }
      setCounts(prev => ({
        ...prev,
        [candidateId]: Math.max(0, (prev[candidateId] ?? 0) - 1),
      }))

      const currentVoters = votersByCandidateRef.current[candidateId] ?? []
      if (currentVoters.includes(userId)) {
        const nextVoters = currentVoters.filter(id => id !== userId)
        votersByCandidateRef.current = { ...votersByCandidateRef.current, [candidateId]: nextVoters }
        setVotersByCandidate(prev => {
          const existing = prev[candidateId] ?? []
          if (!existing.includes(userId)) return prev
          return { ...prev, [candidateId]: existing.filter(id => id !== userId) }
        })
      }

      setError(null)

      socket.emit(VOTE_EVENTS.revoke, {
        roomId,
        categoryId,
        candidateId,
      })
      addSocketBreadcrumb('vote:revoke', { roomId, candidateId })
    },
    [enabled, roomId, categoryId, userId, status, resolveSocket],
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
    resetVote,
    castVote,
    revokeVote,
    resetError,
  }
}
