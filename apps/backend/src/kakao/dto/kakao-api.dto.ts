export class KakaoPlace {
  id: string
  place_name: string
  category_name: string
  category_group_code: string
  category_group_name: string
  phone: string
  address_name: string
  road_address_name: string
  x: string
  y: string
  place_url: string
  distance: string
}

export class KakaoSameName {
  region: string[]
  keyword: string
  selected_region: string
}

export class KakaoMeta {
  total_count: number
  pageable_count: number
  is_end: boolean
  same_name: KakaoSameName
}

export class KakaoLocalSearchResponse {
  documents: KakaoPlace[]
  meta: KakaoMeta
}
