export interface KakaoLocalSearchItem {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code: string;
  category_group_name: string;
  phone: string;
  address_name: string;
  road_address_name: string;
  x: string; // 경도 (longitude)
  y: string; // 위도 (latitude)
  place_url: string;
  distance: string;
}

export interface KakaoLocalSearchMeta {
  total_count: number;
  pageable_count: number;
  is_end: boolean;
  same_name: {
    keyword: string;
    region: string[];
    selected_region: string;
  };
}

export interface KakaoLocalSearchResponse {
  meta: KakaoLocalSearchMeta;
  documents: KakaoLocalSearchItem[];
}
