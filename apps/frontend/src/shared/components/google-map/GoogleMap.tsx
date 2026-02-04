import { useEffect, useRef } from 'react'
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps'
import type { ReactNode } from 'react'
import type { GooglePlace } from '@/shared/types'
import { GooglePlaceMarker } from './place-marker'

interface GoogleMapProps {
  width?: string | number
  height?: string | number
  className?: string
  center?: { lat: number; lng: number }
  zoom?: number
  children?: ReactNode
  onLoad?: (map: google.maps.Map) => void
  draggable?: boolean
  markers?: GooglePlace[]
  selectedMarkerId?: string
  onMarkerClick?: (place: GooglePlace) => void
  showMarkerLabel?: boolean
  showMarkerTooltip?: boolean
}

const DEFAULT_CENTER = { lat: 37.566826, lng: 126.9786567 }

const MapController = ({ center }: { center?: { lat: number; lng: number } }) => {
  const map = useMap()
  const isInitialMount = useRef(true)

  useEffect(() => {
    // 초기 마운트 시에는 panTo 하지 않음
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    // center가 명시적으로 전달된 경우에만 이동
    if (map && center) {
      map.panTo(center)
    }
  }, [map, center])

  return null
}

export const GoogleMap = ({
  width = '100%',
  height = '100%',
  className = '',
  center,
  zoom = 15,
  children,
  onLoad,
  draggable = true,
  markers = [],
  selectedMarkerId,
  onMarkerClick,
  showMarkerLabel = true,
  showMarkerTooltip = true,
}: GoogleMapProps) => {
  const isLoadedRef = useRef(false)
  const containerStyle = { width, height }
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    return (
      <div style={containerStyle} className={`bg-gray-100 flex items-center justify-center ${className}`}>
        <span className="text-red-500">Google Maps API 키가 설정되지 않았습니다.</span>
      </div>
    )
  }

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        style={containerStyle}
        className={className}
        defaultCenter={center ?? DEFAULT_CENTER}
        defaultZoom={zoom}
        gestureHandling={draggable ? 'auto' : 'none'}
        disableDefaultUI={false}
        mapId={import.meta.env.VITE_GOOGLE_MAP_ID}
        onTilesLoaded={e => {
          if (onLoad && e.map && !isLoadedRef.current) {
            isLoadedRef.current = true
            onLoad(e.map)
          }
        }}
      >
        <MapController center={center} />
        {markers.map(place => (
          <GooglePlaceMarker
            key={place.id}
            place={place}
            isSelected={place.id === selectedMarkerId}
            onClick={onMarkerClick}
            showLabel={showMarkerLabel}
            showTooltip={showMarkerTooltip}
          />
        ))}
        {children}
      </Map>
    </APIProvider>
  )
}
