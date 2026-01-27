import { VoteStatus, VoteCandidate } from '../vote.type'

// [S->C] vote:state
export type VoteStatePayload = {
  status: VoteStatus
  candidates: VoteCandidate[]
  counts: Record<string, number>
  myVotes: string[]
}

// [S->C] vote:started
export type VoteStartedPayload = {
  status: 'IN_PROGRESS'
}

// [S->C] vote:ended
export type VoteEndedPayload = {
  status: 'COMPLETED'
  finalResults: { candidateId: string; count: number }[]
}

// [S->C] vote:candidate:updated
export type VoteCandidateUpdatedPayload = {
  action: 'add' | 'remove'
  candidate?: VoteCandidate
  candidateId?: string
}

// [S->C] vote:counts:updated
export type VoteCountsUpdatedPayload = {
  candidateId: string
  count: number
}

// [S->C] vote:me:updated
export type VoteMeUpdatedPayload = {
  myVotes: string[]
}

// [S->C] vote:error
export type VoteErrorPayload = {
  code: string
  message: string
}
