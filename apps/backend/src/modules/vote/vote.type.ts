export enum VoteStatus {
  WAITING = 'WAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export type VoteCandidate = {
  id: string
  placeId: string
  name: string
  address: string
  category?: string
  phone?: string
  imageUrl?: string
  rating?: number
  ratingCount?: number
  createdBy: string
  createdAt: Date
}

export type VoteSession = {
  canvasId: string
  meta: {
    status: VoteStatus
    ownerId: string
    createdAt: Date
  }
  data: {
    candidates: Map<string, VoteCandidate>
  }
  aggs: {
    totalCounts: Map<string, number>
    userVotes: Map<string, Set<string>>
  }
}
