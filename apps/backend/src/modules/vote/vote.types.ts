// [S->C] 후보 장소 정보
export interface Candidate extends PlaceData {
  createdBy: string
  createdAt: Date
}

// [C->S] 후보 등록 시 받아올 place 정보
// TODO: 현재 카카오맵 데이터를 기반으로 구현함. 추후 GoogleMap 데이터 스펙으로 변경
export interface PlaceData {
  distance: string
  category_group_name: string
  place_name: string
  road_address_name: string
  address_name: string
  phone: string
  place_url: string
  id: string
  x: string
  y: string
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
}

// [S->C] 투표 현황
export interface VoteStatePayload {
  status: VoteStatus
  candidates: Candidate[]
  counts: Record<string, number> // candidateId -> 득표수
  myVotes: string[] // 요청한 유저의 투표 목록
}
