// 후보 장소 정보
export interface Candidate extends PlaceData {
  createdBy: string
  createdAt: Date
}

// 후보 등록 시 받아올 place 정보
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

export enum VoteStatus {
  WAITING = 'WAITING', // 후보 등록 대기 중
  IN_PROGRESS = 'IN_PROGRESS', // 투표 진행 중
  COMPLETED = 'COMPLETED', // 투표 종료 (결과 확인)
}

export interface VoteSession {
  status: VoteStatus
  candidates: Map<string, Candidate> // 후보 리스트 (candidate place Id -> Candidate)
  userVotes: Map<string, Set<string>> // 사용자별 투표 기록 (userId -> Set<candidate place Id>)
  totalCounts: Map<string, number> // 후보 득표수 (candidate place Id -> 득표수)
}
