export type VoteStatus = 'idle' | 'voting' | 'ended'

export type VoteValue = 1 | -1 | 0

export interface VoteCandidate {
  id: string
  placeId: string
  title?: string
  imageUrl?: string
  createdBy?: string
}

export type VoteCounts = Record<string, number>

export type MyVotes = Record<string, VoteValue>

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
  isConnected: boolean
  lastError: VoteError | null
}

export interface VoteStatePayload {
  roomId: string
  status: VoteStatus
  candidates: VoteCandidate[]
  counts: VoteCounts
  myVotes?: MyVotes
}

export interface VoteUpdatedPayload {
  roomId: string
  status?: VoteStatus
  candidates?: VoteCandidate[]
  counts?: VoteCounts
  myVotes?: MyVotes
}

export interface VoteStartedPayload {
  roomId: string
  status: 'voting'
}

export interface VoteEndedPayload {
  roomId: string
  status: 'ended'
  result: VoteResult
}

export interface VoteJoinPayload {
  roomId: string
  userId: string
}

export interface VoteLeavePayload {
  roomId: string
  userId: string
}

export interface VoteAddCandidatePayload {
  roomId: string
  placeId: string
  title?: string
  imageUrl?: string
}

export interface VoteCastPayload {
  roomId: string
  candidateId: string
  value: VoteValue
  actionId?: string
}

export interface VoteRevokePayload {
  roomId: string
  candidateId: string
  actionId?: string
}

export interface VoteRoomActionPayload {
  roomId: string
  actionId?: string
}
