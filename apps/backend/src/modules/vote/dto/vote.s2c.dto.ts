import type { ErrorResponse } from '@/lib/types/response.type'
import { Candidate, VoteStatus } from '../vote.types'

// [S->C] vote:state
export type VoteStatePayload = {
  status: VoteStatus
  candidates: Candidate[]
  counts: Record<string, number>
  myVotes: string[]
  voters: Record<string, string[]>
  round: number
  singleVote: boolean
}

// [S->C] vote:started / vote:runoff
export type VoteStartedPayload = {
  status: 'IN_PROGRESS'
  singleVote?: boolean
}

// [S->C] vote:ended
export type VoteEndedPayload = {
  status: 'COMPLETED'
  candidates: Candidate[]
  selectedCandidateId?: string
}

// [S->C] vote:candidate:updated
export type VoteCandidateUpdatedPayload = {
  candidate: Candidate
}

// [S->C] vote:counts:updated
export type VoteCountsUpdatedPayload = {
  candidateId: string
  count: number
  userId: string
  voters: string[]
}

// [S->C] vote:me:updated
export type VoteMeUpdatedPayload = {
  myVotes: string[]
}

// [S->C] vote:error
export type VoteErrorPayload = ErrorResponse

// [S->C] vote:runoff
export type VoteRunOffPayload = {
  tiedCandidates: Candidate[]
  round: number
  singleVote: boolean
}

// [S->C] vote:owner-pick
export type VoteOwnerPickPayload = {
  tiedCandidates: Candidate[]
  status: 'OWNER_PICK'
}
