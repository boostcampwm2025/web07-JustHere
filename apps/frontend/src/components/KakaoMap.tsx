import { Map, useKakaoLoader } from 'react-kakao-maps-sdk'
import type { ReactNode } from 'react'
import PlaceMarker from './main/PlaceMarker'
import type { KakaoPlace } from '@/types/kakao'

interface KakaoMapProps {
  // 크기 관련 (기본값: 100%)
  width?: string | number
  height?: string | number

  // 스타일 커스텀 (Tailwind 클래스 등)
  className?: string

  // 지도 설정 (중심 좌표, 확대 레벨)
  center?: { lat: number; lng: number }
  level?: number

  // 마커 등을 주입받기 위한 children
  children?: ReactNode

  // 지도가 로드되었을 때 호출될 콜백
  onLoad?: (map: kakao.maps.Map) => void

  // 지도 드래그 가능 여부
  draggable?: boolean

  // 마커 관련
  markers?: KakaoPlace[]
  selectedMarkerId?: string
  onMarkerClick?: (place: KakaoPlace) => void
}

function KakaoMap({
  width = '100%',
  height = '100%',
  className = '',
  center = { lat: 37.566826, lng: 126.9786567 },
  level = 3,
  children,
  onLoad,
  draggable = true,
  markers = [],
  selectedMarkerId,
  onMarkerClick,
}: KakaoMapProps) {
  // 2. 카카오맵 로더
  const [loading, error] = useKakaoLoader({
    appkey: import.meta.env.VITE_KAKAO_MAP_API_KEY,
    libraries: ['clusterer', 'services', 'drawing'],
  })

  // 3. 공통 스타일 객체 (로딩 중일 때도 크기를 유지하기 위함)
  const containerStyle = { width, height }

  // 4. 로딩 및 에러 처리 (props로 받은 크기와 클래스 적용)
  if (loading) {
    return (
      <div style={containerStyle} className={`bg-gray-100 flex items-center justify-center ${className}`}>
        <span className="text-gray-500">지도를 불러오는 중...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div style={containerStyle} className={`bg-gray-100 flex items-center justify-center ${className}`}>
        <span className="text-red-500">지도를 불러오는데 실패했습니다.</span>
      </div>
    )
  }

  // 5. 지도 렌더링
  return (
    <Map center={center} style={containerStyle} level={level} className={className} onCreate={onLoad} draggable={draggable}>
      {/* 부모 컴포넌트에서 전달한 마커 등이 여기에 렌더링됨 */}
      {markers.map(place => (
        <PlaceMarker key={place.id} place={place} isSelected={place.id === selectedMarkerId} onClick={onMarkerClick} />
      ))}
      {children}
    </Map>
  )
}

export default KakaoMap
