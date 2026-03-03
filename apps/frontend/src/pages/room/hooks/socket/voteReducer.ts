import type {
  VoteCandidate,
  VoteEndedPayload,
  VoteErrorPayload,
  VoteOwnerPickPayload,
  VoteParticipantLeftPayload,
  VoteResettedPayload,
  VoteRunoffPayload,
  VoteStatePayload,
  VoteStatus,
} from '@/pages/room/types'

// ─── State ────────────────────────────────────────────────────────────────────

export interface VoteReducerState {
  status: VoteStatus
  singleVote: boolean
  round: number
  candidates: VoteCandidate[]
  counts: Record<string, number>
  myVotes: string[]
  votersByCandidate: Record<string, string[]>
  selectedCandidateId: string | null
  error: VoteErrorPayload | null
}

export const initialVoteState: VoteReducerState = {
  status: 'WAITING',
  singleVote: false,
  round: 1,
  candidates: [],
  counts: {},
  myVotes: [],
  votersByCandidate: {},
  selectedCandidateId: null,
  error: null,
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export type VoteAction =
  // 상태 초기화
  | { type: 'RESET' }
  // S→C 이벤트
  | { type: 'SET_STATE'; payload: VoteStatePayload }
  | { type: 'CANDIDATE_ADDED'; candidate: VoteCandidate }
  | { type: 'CANDIDATE_REMOVED'; placeId: string }
  | { type: 'COUNTS_UPDATED'; candidateId: string; count: number; voters: string[] }
  | { type: 'ME_UPDATED'; myVotes: string[] }
  | { type: 'STARTED'; status: VoteStatus }
  | { type: 'ENDED'; payload: VoteEndedPayload }
  | { type: 'RUNOFF'; payload: VoteRunoffPayload }
  | { type: 'OWNER_PICK'; payload: VoteOwnerPickPayload }
  | { type: 'RESETTED'; payload: VoteResettedPayload }
  | { type: 'PARTICIPANT_LEFT'; payload: VoteParticipantLeftPayload }
  | { type: 'SET_ERROR'; error: VoteErrorPayload }
  | { type: 'ROLLBACK_TO_WAITING' }
  | { type: 'CLEAR_ERROR' }
  // Optimistic updates (C→S)
  | { type: 'OPTIMISTIC_ADD_CANDIDATE'; candidate: VoteCandidate }
  | { type: 'OPTIMISTIC_REMOVE_CANDIDATE'; candidateId: string }
  | { type: 'OPTIMISTIC_START' }
  | { type: 'OPTIMISTIC_CAST'; candidateId: string; userId: string }
  | { type: 'OPTIMISTIC_REVOKE'; candidateId: string; userId: string }
  | { type: 'OPTIMISTIC_RECAST'; oldCandidateId: string; newCandidateId: string; userId: string }

export function voteReducer(state: VoteReducerState, action: VoteAction): VoteReducerState {
  switch (action.type) {
    case 'RESET':
      return initialVoteState

    case 'SET_STATE':
      return {
        ...state,
        status: action.payload.status,
        candidates: action.payload.candidates,
        counts: action.payload.counts,
        myVotes: action.payload.myVotes,
        votersByCandidate: action.payload.voters ?? {},
        round: action.payload.round,
        singleVote: action.payload.singleVote,
        selectedCandidateId: null,
        error: null,
      }

    case 'CANDIDATE_ADDED': {
      const { candidate } = action
      const filtered = state.candidates.filter(c => c.placeId !== candidate.placeId)
      return {
        ...state,
        candidates: [...filtered, candidate],
        counts: candidate.placeId in state.counts ? state.counts : { ...state.counts, [candidate.placeId]: 0 },
        votersByCandidate:
          candidate.placeId in state.votersByCandidate ? state.votersByCandidate : { ...state.votersByCandidate, [candidate.placeId]: [] },
        error: null,
      }
    }

    case 'CANDIDATE_REMOVED': {
      const { placeId } = action
      const nextCounts = { ...state.counts }
      delete nextCounts[placeId]
      const nextVoters = { ...state.votersByCandidate }
      delete nextVoters[placeId]
      return {
        ...state,
        candidates: state.candidates.filter(c => c.placeId !== placeId),
        counts: nextCounts,
        votersByCandidate: nextVoters,
        error: null,
      }
    }

    case 'COUNTS_UPDATED':
      return {
        ...state,
        counts: { ...state.counts, [action.candidateId]: action.count },
        votersByCandidate: { ...state.votersByCandidate, [action.candidateId]: action.voters },
      }

    case 'ME_UPDATED':
      return { ...state, myVotes: action.myVotes, error: null }

    case 'STARTED':
      return { ...state, status: action.status, selectedCandidateId: null, error: null }

    case 'ENDED':
      return {
        ...state,
        status: action.payload.status,
        candidates: action.payload.candidates,
        selectedCandidateId: action.payload.selectedCandidateId ?? null,
        singleVote: false,
        round: 1,
        error: null,
      }

    case 'RUNOFF': {
      const resetCounts: Record<string, number> = {}
      const resetVoters: Record<string, string[]> = {}
      for (const c of action.payload.tiedCandidates) {
        resetCounts[c.placeId] = 0
        resetVoters[c.placeId] = []
      }
      return {
        ...state,
        status: 'IN_PROGRESS',
        candidates: action.payload.tiedCandidates,
        singleVote: action.payload.singleVote,
        round: action.payload.round,
        myVotes: [],
        counts: resetCounts,
        votersByCandidate: resetVoters,
        selectedCandidateId: null,
        error: null,
      }
    }

    case 'OWNER_PICK':
      return {
        ...state,
        status: action.payload.status,
        candidates: action.payload.tiedCandidates,
        selectedCandidateId: null,
        error: null,
      }

    case 'RESETTED':
      return {
        ...state,
        status: action.payload.status,
        candidates: action.payload.candidates,
        counts: action.payload.counts,
        myVotes: [],
        votersByCandidate: action.payload.voters,
        selectedCandidateId: null,
        error: null,
      }

    case 'PARTICIPANT_LEFT':
      return {
        ...state,
        counts: action.payload.counts,
        votersByCandidate: action.payload.voters,
      }

    case 'SET_ERROR':
      return { ...state, error: action.error }

    case 'ROLLBACK_TO_WAITING':
      return { ...state, status: state.status === 'IN_PROGRESS' ? 'WAITING' : state.status, selectedCandidateId: null }

    case 'CLEAR_ERROR':
      return { ...state, error: null }

    case 'OPTIMISTIC_ADD_CANDIDATE': {
      const { candidate } = action
      if (state.candidates.some(c => c.placeId === candidate.placeId)) return state
      return {
        ...state,
        candidates: [...state.candidates, candidate],
        counts: { ...state.counts, [candidate.placeId]: 0 },
        votersByCandidate: { ...state.votersByCandidate, [candidate.placeId]: [] },
        error: null,
      }
    }

    case 'OPTIMISTIC_REMOVE_CANDIDATE': {
      const { candidateId } = action
      const nextCounts = { ...state.counts }
      delete nextCounts[candidateId]
      const nextVoters = { ...state.votersByCandidate }
      delete nextVoters[candidateId]
      return {
        ...state,
        candidates: state.candidates.filter(c => c.placeId !== candidateId),
        counts: nextCounts,
        myVotes: state.myVotes.filter(id => id !== candidateId),
        votersByCandidate: nextVoters,
        error: null,
      }
    }

    case 'OPTIMISTIC_START':
      return { ...state, status: 'IN_PROGRESS', selectedCandidateId: null, error: null }

    case 'OPTIMISTIC_CAST': {
      const { candidateId, userId } = action
      if (state.myVotes.includes(candidateId)) return state
      const existingVoters = state.votersByCandidate[candidateId] ?? []
      return {
        ...state,
        myVotes: [...state.myVotes, candidateId],
        counts: { ...state.counts, [candidateId]: (state.counts[candidateId] ?? 0) + 1 },
        votersByCandidate: {
          ...state.votersByCandidate,
          [candidateId]: existingVoters.includes(userId) ? existingVoters : [...existingVoters, userId],
        },
        error: null,
      }
    }

    case 'OPTIMISTIC_REVOKE': {
      const { candidateId, userId } = action
      if (!state.myVotes.includes(candidateId)) return state
      const existingVoters = state.votersByCandidate[candidateId] ?? []
      return {
        ...state,
        myVotes: state.myVotes.filter(id => id !== candidateId),
        counts: { ...state.counts, [candidateId]: Math.max(0, (state.counts[candidateId] ?? 0) - 1) },
        votersByCandidate: {
          ...state.votersByCandidate,
          [candidateId]: existingVoters.filter(id => id !== userId),
        },
        error: null,
      }
    }

    case 'OPTIMISTIC_RECAST': {
      const { oldCandidateId, newCandidateId, userId } = action
      if (!state.myVotes.includes(oldCandidateId)) return state
      if (state.myVotes.includes(newCandidateId)) return state

      const oldVoters = state.votersByCandidate[oldCandidateId] ?? []
      const newVoters = state.votersByCandidate[newCandidateId] ?? []

      return {
        ...state,
        myVotes: [...state.myVotes.filter(id => id !== oldCandidateId), newCandidateId],
        counts: {
          ...state.counts,
          [oldCandidateId]: Math.max(0, (state.counts[oldCandidateId] ?? 0) - 1),
          [newCandidateId]: (state.counts[newCandidateId] ?? 0) + 1,
        },
        votersByCandidate: {
          ...state.votersByCandidate,
          [oldCandidateId]: oldVoters.filter(id => id !== userId),
          [newCandidateId]: newVoters.includes(userId) ? newVoters : [...newVoters, userId],
        },
        error: null,
      }
    }

    default:
      return state
  }
}
