import { APIProvider, Map } from '@vis.gl/react-google-maps'
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
}

export const GoogleMap = ({
  width = '100%',
  height = '100%',
  className = '',
  center = { lat: 37.566826, lng: 126.9786567 },
  zoom = 15,
  children,
  onLoad,
  draggable = true,
  markers = [],
  selectedMarkerId,
  onMarkerClick,
}: GoogleMapProps) => {
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
        defaultCenter={center}
        defaultZoom={zoom}
        gestureHandling={draggable ? 'auto' : 'none'}
        disableDefaultUI={false}
        mapId={import.meta.env.VITE_GOOGLE_MAP_ID || 'DEMO_MAP_ID'}
        onTilesLoaded={e => {
          if (onLoad && e.map) {
            onLoad(e.map)
          }
        }}
      >
        {markers.map(place => (
          <GooglePlaceMarker key={place.id} place={place} isSelected={place.id === selectedMarkerId} onClick={onMarkerClick} />
        ))}
        {children}
      </Map>
    </APIProvider>
  )
}
