declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void
        services: {
          Places: new () => {
            keywordSearch: (keyword: string, callback: (result: KakaoPlace[], status: KakaoStatus) => void) => void
          }
          Status: {
            OK: 'OK'
            ZERO_RESULT: 'ZERO_RESULT'
            ERROR: 'ERROR'
          }
        }
        LatLng: new (lat: number, lng: number) => KakaoLatLng
        Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number; draggable?: boolean }) => KakaoMap
        Marker: new (options: { position: KakaoLatLng; map?: KakaoMap }) => KakaoMarker
      }
    }
  }
}

export interface KakaoLatLng {
  getLat: () => number
  getLng: () => number
}

export interface KakaoMap {
  setCenter: (latlng: KakaoLatLng) => void
  setLevel: (level: number) => void
}

export interface KakaoMarker {
  setMap: (map: KakaoMap | null) => void
  setPosition: (latlng: KakaoLatLng) => void
}

export type KakaoStatus = 'OK' | 'ZERO_RESULT' | 'ERROR'

export interface KakaoPlace {
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

export interface KakaoSameName {
  region: string[]
  keyword: string
  selected_region: string
}

export interface KakaoMeta {
  total_count: number
  pageable_count: number
  is_end: boolean
  same_name: KakaoSameName
}

export {}
