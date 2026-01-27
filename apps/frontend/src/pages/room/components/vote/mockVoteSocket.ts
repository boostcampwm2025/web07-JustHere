import { VOTE_EVENTS, type VoteEventName } from './events'
import type { VoteSocketLike, VoteSocketEventName } from './socketTypes'
import type {
  VoteAddCandidatePayload,
  VoteCandidate,
  VoteCandidateUpdatedPayload,
  VoteCastPayload,
  VoteCounts,
  VoteCountsUpdatedPayload,
  VoteEndedPayload,
  VoteError,
  VoteJoinPayload,
  VoteMeUpdatedPayload,
  VoteRemoveCandidatePayload,
  VoteRevokePayload,
  VoteRoomActionPayload,
  VoteStartedPayload,
  VoteStatePayload,
  VoteStatus,
} from './types'

type Handler<T = unknown> = (payload: T) => void

type UserVotes = Set<string>

interface MockRoomState {
  roomId: string
  status: VoteStatus
  candidates: VoteCandidate[]
  counts: VoteCounts
  votesByUser: Record<string, UserVotes>
}

const MOCK_LATENCY_MS = 120
const MOCK_ERROR_RATE = 0.1

const rooms = new Map<string, MockRoomState>()
let candidateSeq = 1

function getOrCreateRoom(roomId: string): MockRoomState {
  const existing = rooms.get(roomId)
  if (existing) return existing

  const initial: MockRoomState = {
    roomId,
    status: 'WAITING',
    candidates: [],
    counts: {},
    votesByUser: {},
  }

  rooms.set(roomId, initial)
  return initial
}

function ensureUserVotes(room: MockRoomState, userId: string): UserVotes {
  if (!room.votesByUser[userId]) {
    room.votesByUser[userId] = new Set<string>()
  }
  return room.votesByUser[userId]
}

function toStatePayload(room: MockRoomState, userId: string, isOwner: boolean): VoteStatePayload {
  const myVotes = Array.from(ensureUserVotes(room, userId))
  return {
    roomId: room.roomId,
    status: room.status,
    candidates: room.candidates,
    counts: room.counts,
    myVotes,
    isOwner,
  }
}

function buildResult(room: MockRoomState): VoteEndedPayload['result'] {
  const items = room.candidates
    .map(candidate => ({
      candidateId: candidate.id,
      count: room.counts[candidate.id] ?? 0,
    }))
    .sort((a, b) => b.count - a.count)

  return {
    roomId: room.roomId,
    items,
  }
}

function shouldFail(): boolean {
  return Math.random() < MOCK_ERROR_RATE
}

function nextCandidateId(): string {
  const id = `mock-candidate-${candidateSeq}`
  candidateSeq += 1
  return id
}

function nowIso(): string {
  return new Date().toISOString()
}

export function createMockVoteSocket(): VoteSocketLike {
  const handlers = new Map<string, Set<Handler>>()
  let connected = false
  let currentUserId: string | null = null
  let currentIsOwner = false

  const addHandler = <T>(event: VoteSocketEventName, handler: Handler<T>) => {
    const set = handlers.get(event) ?? new Set<Handler>()
    set.add(handler as Handler)
    handlers.set(event, set)
  }

  const removeHandler = <T>(event: VoteSocketEventName, handler: Handler<T>) => {
    const set = handlers.get(event)
    if (!set) return
    set.delete(handler as Handler)
    if (set.size === 0) handlers.delete(event)
  }

  const dispatch = (event: string, payload?: unknown) => {
    const set = handlers.get(event)
    if (!set) return
    set.forEach(handler => {
      handler(payload)
    })
  }

  const schedule = (fn: () => void) => {
    window.setTimeout(fn, MOCK_LATENCY_MS)
  }

  const emitError = (error: VoteError) => {
    schedule(() => {
      dispatch(VOTE_EVENTS.error, error)
    })
  }

  const emitCountsUpdated = (payload: VoteCountsUpdatedPayload) => {
    schedule(() => {
      dispatch(VOTE_EVENTS.countsUpdated, payload)
    })
  }

  const emitMeUpdated = (payload: VoteMeUpdatedPayload) => {
    schedule(() => {
      dispatch(VOTE_EVENTS.meUpdated, payload)
    })
  }

  const emitCandidateUpdated = (payload: VoteCandidateUpdatedPayload) => {
    schedule(() => {
      dispatch(VOTE_EVENTS.candidateUpdated, payload)
    })
  }

  const emitStatusChanged = (roomId: string, status: VoteStatus) => {
    schedule(() => {
      dispatch(VOTE_EVENTS.statusChanged, { roomId, status })
    })
  }

  const connect = () => {
    if (connected) return
    connected = true
    dispatch('connect')
  }

  const disconnect = () => {
    if (!connected) return
    connected = false
    dispatch('disconnect')
    currentUserId = null
    currentIsOwner = false
  }

  const handleJoin = (payload?: VoteJoinPayload) => {
    if (!payload) return

    currentUserId = payload.userId ?? 'mock-user'
    currentIsOwner = payload.isOwner ?? false

    const room = getOrCreateRoom(payload.roomId)
    const state = toStatePayload(room, currentUserId, currentIsOwner)

    schedule(() => {
      dispatch(VOTE_EVENTS.state, state)
    })
  }

  const handleLeave = () => {
    currentUserId = null
    currentIsOwner = false
  }

  const handleAddCandidate = (payload?: VoteAddCandidatePayload) => {
    if (!payload) return

    const room = getOrCreateRoom(payload.roomId)

    if (room.status !== 'WAITING') {
      emitError({
        code: 'VOTE_ALREADY_STARTED',
        message: '투표가 이미 시작되어 후보를 수정할 수 없습니다.',
      })
      return
    }

    const duplicated = room.candidates.some(c => c.placeId === payload.placeId)
    if (duplicated) {
      emitError({
        code: 'CANDIDATE_DUPLICATED',
        message: '이미 등록된 장소입니다.',
      })
      return
    }

    const createdBy = currentUserId ?? 'mock-user'

    const candidate: VoteCandidate = {
      id: nextCandidateId(),
      placeId: payload.placeId,
      name: payload.name,
      address: payload.address,
      category: payload.category,
      createdBy,
      createdAt: nowIso(),
    }

    room.candidates = [...room.candidates, candidate]
    room.counts = {
      ...room.counts,
      [candidate.id]: 0,
    }

    emitCandidateUpdated({
      roomId: room.roomId,
      action: 'add',
      candidate,
    })

    emitCountsUpdated({
      roomId: room.roomId,
      candidateId: candidate.id,
      count: room.counts[candidate.id],
    })
  }

  const handleRemoveCandidate = (payload?: VoteRemoveCandidatePayload) => {
    if (!payload) return

    const room = getOrCreateRoom(payload.roomId)

    if (room.status !== 'WAITING') {
      emitError({
        code: 'VOTE_ALREADY_STARTED',
        message: '투표가 이미 시작되어 후보를 수정할 수 없습니다.',
        actionId: payload.actionId,
      })
      return
    }

    const exists = room.candidates.some(candidate => candidate.id === payload.candidateId)
    if (!exists) {
      emitError({
        code: 'CANDIDATE_NOT_FOUND',
        message: '존재하지 않는 후보입니다.',
        actionId: payload.actionId,
      })
      return
    }

    room.candidates = room.candidates.filter(candidate => candidate.id !== payload.candidateId)

    const nextCounts: VoteCounts = { ...room.counts }
    delete nextCounts[payload.candidateId]
    room.counts = nextCounts

    Object.values(room.votesByUser).forEach(votes => {
      votes.delete(payload.candidateId)
    })

    emitCandidateUpdated({
      roomId: room.roomId,
      action: 'remove',
      candidateId: payload.candidateId,
    })
  }

  const handleStart = (payload?: VoteRoomActionPayload) => {
    if (!payload) return

    if (!currentIsOwner) {
      emitError({
        code: 'NOT_OWNER',
        message: '방장 권한이 필요합니다.',
        actionId: payload.actionId,
      })
      return
    }

    const room = getOrCreateRoom(payload.roomId)

    if (room.status !== 'WAITING') {
      emitError({
        code: 'VOTE_ALREADY_STARTED',
        message: '이미 투표가 진행 중이거나 종료되었습니다.',
        actionId: payload.actionId,
      })
      return
    }

    room.status = 'IN_PROGRESS'

    schedule(() => {
      const startedPayload: VoteStartedPayload = { roomId: room.roomId, status: 'IN_PROGRESS' }
      dispatch(VOTE_EVENTS.started, startedPayload)
      dispatch(VOTE_EVENTS.stared, startedPayload)
    })

    emitStatusChanged(room.roomId, room.status)
  }

  const handleEnd = (payload?: VoteRoomActionPayload) => {
    if (!payload) return

    if (!currentIsOwner) {
      emitError({
        code: 'NOT_OWNER',
        message: '방장 권한이 필요합니다.',
        actionId: payload.actionId,
      })
      return
    }

    const room = getOrCreateRoom(payload.roomId)

    if (room.status !== 'IN_PROGRESS') {
      emitError({
        code: 'VOTE_NOT_STARTED',
        message: '진행 중인 투표가 없습니다.',
        actionId: payload.actionId,
      })
      return
    }

    room.status = 'COMPLETED'
    const result = buildResult(room)

    schedule(() => {
      dispatch(VOTE_EVENTS.ended, { roomId: room.roomId, status: 'COMPLETED', result })
    })

    emitStatusChanged(room.roomId, room.status)
  }

  const handleCast = (payload?: VoteCastPayload) => {
    if (!payload) return

    if (!currentUserId) {
      emitError({
        code: 'NOT_JOINED',
        message: '먼저 투표 세션에 참여해야 합니다.',
        actionId: payload.actionId,
      })
      return
    }

    const room = getOrCreateRoom(payload.roomId)

    if (room.status !== 'IN_PROGRESS') {
      emitError({
        code: 'VOTE_NOT_STARTED',
        message: '투표가 아직 시작되지 않았습니다.',
        actionId: payload.actionId,
      })
      return
    }

    const exists = room.candidates.some(candidate => candidate.id === payload.candidateId)
    if (!exists) {
      emitError({
        code: 'CANDIDATE_NOT_FOUND',
        message: '존재하지 않는 후보입니다.',
        actionId: payload.actionId,
      })
      return
    }

    if (shouldFail()) {
      emitError({
        code: 'MOCK_CAST_FAILED',
        message: '모의 서버에서 투표가 실패했습니다. 다시 시도해 주세요.',
        actionId: payload.actionId,
        recoverable: true,
      })
      return
    }

    const votes = ensureUserVotes(room, currentUserId)
    const hasVote = votes.has(payload.candidateId)

    if (!hasVote) {
      votes.add(payload.candidateId)
      const currentCount = room.counts[payload.candidateId] ?? 0
      room.counts = {
        ...room.counts,
        [payload.candidateId]: currentCount + 1,
      }
    }

    emitCountsUpdated({
      roomId: room.roomId,
      candidateId: payload.candidateId,
      count: room.counts[payload.candidateId] ?? 0,
    })

    emitMeUpdated({
      roomId: room.roomId,
      myVotes: Array.from(votes),
    })
  }

  const handleRevoke = (payload?: VoteRevokePayload) => {
    if (!payload) return

    if (!currentUserId) {
      emitError({
        code: 'NOT_JOINED',
        message: '먼저 투표 세션에 참여해야 합니다.',
        actionId: payload.actionId,
      })
      return
    }

    const room = getOrCreateRoom(payload.roomId)

    if (room.status !== 'IN_PROGRESS') {
      emitError({
        code: 'VOTE_NOT_STARTED',
        message: '투표가 아직 시작되지 않았습니다.',
        actionId: payload.actionId,
      })
      return
    }

    const votes = ensureUserVotes(room, currentUserId)
    const hadVote = votes.delete(payload.candidateId)

    if (hadVote) {
      const currentCount = room.counts[payload.candidateId] ?? 0
      room.counts = {
        ...room.counts,
        [payload.candidateId]: Math.max(0, currentCount - 1),
      }
    }

    emitCountsUpdated({
      roomId: room.roomId,
      candidateId: payload.candidateId,
      count: room.counts[payload.candidateId] ?? 0,
    })

    emitMeUpdated({
      roomId: room.roomId,
      myVotes: Array.from(votes),
    })
  }

  const emit = <T>(event: VoteEventName, payload?: T) => {
    if (!connected) return

    switch (event) {
      case VOTE_EVENTS.join:
        handleJoin(payload as VoteJoinPayload | undefined)
        return
      case VOTE_EVENTS.leave:
        handleLeave()
        return
      case VOTE_EVENTS.addCandidate:
        handleAddCandidate(payload as VoteAddCandidatePayload | undefined)
        return
      case VOTE_EVENTS.removeCandidate:
        handleRemoveCandidate(payload as VoteRemoveCandidatePayload | undefined)
        return
      case VOTE_EVENTS.start:
        handleStart(payload as VoteRoomActionPayload | undefined)
        return
      case VOTE_EVENTS.end:
        handleEnd(payload as VoteRoomActionPayload | undefined)
        return
      case VOTE_EVENTS.cast:
        handleCast(payload as VoteCastPayload | undefined)
        return
      case VOTE_EVENTS.revoke:
        handleRevoke(payload as VoteRevokePayload | undefined)
        return
      default:
        return
    }
  }

  return {
    get connected() {
      return connected
    },
    connect,
    disconnect,
    on: addHandler,
    off: removeHandler,
    emit,
  }
}

export function resetMockVoteRooms() {
  rooms.clear()
  candidateSeq = 1
}
