import type { ErrorPayload } from '@/shared/types'

export type VoteStatus = 'WAITING' | 'IN_PROGRESS' | 'OWNER_PICK' | 'COMPLETED'

export interface PlaceData {
  placeId: string
  name: string
  address: string
  category?: string
  phone?: string
  imageUrl?: string
  rating?: number
  ratingCount?: number
}

export interface VoteCandidate extends PlaceData {
  createdBy: string
  createdAt: Date | string
}

export type VoteCounts = Record<string, number>

export type MyVotes = string[]

export interface VoteState {
  roomId: string
  status: VoteStatus
  candidates: VoteCandidate[]
  counts: VoteCounts
  myVotes: MyVotes
  voters: Record<string, string[]>
  isOwner: boolean
  isConnected: boolean
  lastError: VoteError | null
}

// [S->C] vote:state
export interface VoteStatePayload {
  status: VoteStatus
  candidates: VoteCandidate[]
  counts: VoteCounts
  myVotes: MyVotes
  voters: Record<string, string[]>
}

// [S->C] vote:started
export interface VoteStartedPayload {
  status: 'IN_PROGRESS'
}

// [S->C] vote:ended
export interface VoteEndedPayload {
  status: 'COMPLETED'
  candidates: VoteCandidate[]
}

// [S->C] vote:candidate:updated
export interface VoteCandidateUpdatedPayload {
  candidate: VoteCandidate
}

// [S->C] vote:counts:updated
export interface VoteCountsUpdatedPayload {
  candidateId: string
  count: number
  userId: string
  voters: string[]
}

// [S->C] vote:me:updated
export interface VoteMeUpdatedPayload {
  myVotes: MyVotes
}

// [S->C] vote:error
export type VoteErrorPayload = ErrorPayload
export type VoteError = ErrorPayload

// [S->C] vote:runoff
export interface VoteRunoffPayload {
  tiedCandidates: VoteCandidate[]
  round: number
  singleVote: boolean
}

// [S->C] vote:owner-pick
export interface VoteOwnerPickPayload {
  tiedCandidates: VoteCandidate[]
  status: 'OWNER_PICK'
}

// [C->S] vote:join
export interface VoteJoinPayload {
  roomId: string
  categoryId: string
  userId?: string
}

// [C->S] vote:leave
export interface VoteLeavePayload {
  roomId: string
  categoryId: string
}

// [C->S] vote:candidate:add
export interface VoteCandidateAddPayload {
  roomId: string
  categoryId: string
  placeId: string
  name: string
  address: string
  category?: string
  phone?: string
  imageUrl?: string
  rating?: number
  ratingCount?: number
}

// [C->S] vote:candidate:remove
export interface VoteCandidateRemovePayload {
  roomId: string
  categoryId: string
  candidateId: string
}

// [C->S] vote:cast
export interface VoteCastPayload {
  roomId: string
  categoryId: string
  candidateId: string
}

// [C->S] vote:revoke
export interface VoteRevokePayload {
  roomId: string
  categoryId: string
  candidateId: string
}

// [C->S] vote:start
export interface VoteStartPayload {
  roomId: string
  categoryId: string
}

// [C->S] vote:end
export interface VoteEndPayload {
  roomId: string
  categoryId: string
}

// [C->S] vote:owner-select
export interface VoteOwnerSelectPayload {
  roomId: string
  categoryId: string
  candidateId: string
}
