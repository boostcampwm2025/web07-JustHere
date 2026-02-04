import { useState } from 'react'
import { AdvancedMarker } from '@vis.gl/react-google-maps'
import type { GooglePlace } from '@/shared/types'
import { cn } from '@/shared/utils'

interface GooglePlaceMarkerProps {
  place: GooglePlace
  isSelected?: boolean
  onClick?: (place: GooglePlace) => void
  showLabel?: boolean
  showTooltip?: boolean
}

export const GooglePlaceMarker = ({ place, isSelected, onClick, showLabel = true, showTooltip = true }: GooglePlaceMarkerProps) => {
  const [isHovered, setIsHovered] = useState(false)

  const position = {
    lat: place.location.latitude,
    lng: place.location.longitude,
  }

  return (
    <AdvancedMarker position={position} onClick={() => onClick?.(place)}>
      <div
        className="relative flex flex-col items-center cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {showTooltip && (isHovered || isSelected) && (
          <div className="absolute bottom-full mb-2 px-3 py-1.5 bg-white rounded-lg shadow-lg border border-gray-200 whitespace-nowrap z-10">
            <p className="text-sm font-bold text-gray-800">{place.displayName.text}</p>
            {place.primaryTypeDisplayName && <p className="text-xs text-gray">{place.primaryTypeDisplayName.text}</p>}
            {place.rating && (
              <p className="text-xs text-yellow-500">
                {'★'.repeat(Math.round(place.rating))} {place.rating.toFixed(1)}
              </p>
            )}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-white border-r border-b border-gray-200 rotate-45" />
          </div>
        )}

        <div
          className={cn(
            'relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200',
            isSelected ? 'bg-primary-pressed scale-125' : 'bg-primary',
            isHovered && 'scale-110',
          )}
        >
          <div className="w-3 h-3 bg-white rounded-full" />
        </div>

        <div
          className={cn(
            'w-0 h-0 -mt-1 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[10px] transition-all duration-200',
            isSelected ? 'border-t-primary-pressed' : 'border-t-primary',
          )}
        />

        {showLabel && (
          <div className="absolute top-full mt-1 px-1.5 py-0.5 bg-white/90 rounded-md shadow-sm border border-gray-100 backdrop-blur-[2px]">
            <p className="text-[11px] font-semibold text-gray-700 whitespace-nowrap max-w-[120px] truncate">{place.displayName.text}</p>
          </div>
        )}
      </div>
    </AdvancedMarker>
  )
}
