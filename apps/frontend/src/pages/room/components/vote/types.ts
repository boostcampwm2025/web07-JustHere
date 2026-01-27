export type VoteStatus = 'WAITING' | 'IN_PROGRESS' | 'COMPLETED'

export interface VoteCandidate {
  id: string
  placeId: string
  name: string
  address: string
  category: string
  createdBy: string
  createdAt: string
}

export type VoteCounts = Record<string, number>

export type MyVotes = string[]

export interface VoteError {
  code: string
  message: string
  actionId?: string
  recoverable?: boolean
}

export interface VoteResultItem {
  candidateId: string
  count: number
}

export interface VoteResult {
  roomId: string
  items: VoteResultItem[]
}

export interface VoteState {
  roomId: string
  status: VoteStatus
  candidates: VoteCandidate[]
  counts: VoteCounts
  myVotes: MyVotes
  isOwner: boolean
  isConnected: boolean
  lastError: VoteError | null
}

export interface VoteStatePayload {
  roomId: string
  status: VoteStatus
  candidates: VoteCandidate[]
  counts: VoteCounts
  myVotes?: MyVotes
  isOwner?: boolean
}

export interface VoteUpdatedPayload {
  roomId: string
  status?: VoteStatus
  candidates?: VoteCandidate[]
  counts?: VoteCounts
  myVotes?: MyVotes
  isOwner?: boolean
}

export interface VoteStartedPayload {
  roomId: string
  status: 'IN_PROGRESS'
}

export interface VoteEndedPayload {
  roomId: string
  status: 'COMPLETED'
  result: VoteResult
}

export interface VoteJoinPayload {
  roomId: string
  userId?: string
  isOwner?: boolean
}

export interface VoteLeavePayload {
  roomId: string
  userId?: string
}

export interface VoteAddCandidatePayload {
  roomId: string
  placeId: string
  name: string
  address: string
  category: string
}

export interface VoteRemoveCandidatePayload {
  roomId: string
  candidateId: string
  actionId?: string
}

export interface VoteCandidateUpdatedPayload {
  roomId: string
  action: 'add' | 'remove'
  candidate?: VoteCandidate
  candidateId?: string
}

export interface VoteCastPayload {
  roomId: string
  candidateId: string
  actionId?: string
}

export interface VoteRevokePayload {
  roomId: string
  candidateId: string
  actionId?: string
}

export interface VoteCountsUpdatedPayload {
  roomId: string
  candidateId: string
  count: number
}

export interface VoteMeUpdatedPayload {
  roomId: string
  myVotes: MyVotes
}

export interface VoteRoomActionPayload {
  roomId: string
  actionId?: string
}
