export interface Candidate {
  distance: string
  category_name: string
  place_name: string
  road_address_name: string
  address_name: string
  phone: string
  place_url: string
  id: string
  x: string
  y: string
  addedBy?: string // 누가 추가했는지 (선택 사항)
}
