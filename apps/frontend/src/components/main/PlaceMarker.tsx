import { useState } from 'react'
import { CustomOverlayMap } from 'react-kakao-maps-sdk'
import type { KakaoPlace } from '@/types/kakao'
import { cn } from '@/utils/cn'

interface PlaceMarkerProps {
  place: KakaoPlace
  isSelected?: boolean
  onClick?: (place: KakaoPlace) => void
}

export const PlaceMarker = ({ place, isSelected, onClick }: PlaceMarkerProps) => {
  const [isHovered, setIsHovered] = useState(false)

  const position = {
    lat: Number(place.y),
    lng: Number(place.x),
  }

  return (
    <CustomOverlayMap position={position} yAnchor={1.3}>
      <div
        className="relative flex flex-col items-center cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => onClick?.(place)}
      >
        {/* 호버 시 장소명 오버레이 */}
        {isHovered && (
          <div className="absolute bottom-full mb-2 px-3 py-1.5 bg-white rounded-lg shadow-lg border border-gray-200 whitespace-nowrap z-10">
            <p className="text-sm font-bold text-gray-800">{place.place_name}</p>
            <p className="text-xs text-gray">{place.category_group_name}</p>
            {/* 말풍선 꼬리 */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-white border-r border-b border-gray-200 rotate-45" />
          </div>
        )}

        {/* 핀 마커 */}
        <div
          className={cn(
            'relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200',
            isSelected ? 'bg-primary-pressed scale-125' : 'bg-primary',
            isHovered && 'scale-110',
          )}
        >
          {/* 내부 흰색 원 */}
          <div className="w-3 h-3 bg-white rounded-full" />
        </div>

        {/* 핀 꼬리 */}
        <div
          className={cn(
            'w-0 h-0 -mt-1 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[10px] transition-all duration-200',
            isSelected ? 'border-t-primary-pressed' : 'border-t-primary',
          )}
        />
      </div>
    </CustomOverlayMap>
  )
}
