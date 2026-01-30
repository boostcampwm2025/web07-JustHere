import { useRef, useEffect, useState } from 'react'
import { useGoogleSearch } from '@/shared/hooks'
import { Button, SearchInput } from '@/shared/components'
import { GoogleMap } from '@/shared/components/google-map'
import type { GooglePlace } from '@/shared/types'
import { SearchResultsList } from './search-result'

interface LocationStepProps {
  onNext: (location: { name: string; address: string; x: number; y: number }) => void
}

export const LocationStep = ({ onNext }: LocationStepProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPlace, setSelectedPlace] = useState<GooglePlace | null>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)

  const { data: searchResults, isLoading } = useGoogleSearch({ textQuery: searchTerm })
  const listContainerRef = useRef<HTMLDivElement>(null)

  const defaultCenter = { lat: 37.498095, lng: 127.02761 }

  const getCenter = () => {
    if (selectedPlace) {
      return { lat: selectedPlace.location.latitude, lng: selectedPlace.location.longitude }
    }
    return defaultCenter
  }

  const handleSearch = () => {
    const trimmedQuery = searchQuery.trim()
    if (!trimmedQuery) {
      setSearchTerm('')
      setSearchQuery('')
      setSelectedPlace(null)
      return
    }
    setSearchTerm(trimmedQuery)
  }

  useEffect(() => {
    if (listContainerRef.current) {
      listContainerRef.current.scrollTop = 0
    }
  }, [searchResults])

  const handleNext = () => {
    if (selectedPlace) {
      onNext({
        name: selectedPlace.displayName.text,
        address: selectedPlace.formattedAddress,
        x: selectedPlace.location.longitude,
        y: selectedPlace.location.latitude,
      })
    }
  }

  const places = searchResults?.places ?? []

  return (
    <>
      <h1 className="text-2xl font-medium text-black text-center mb-8">만날 지역을 선택해보세요</h1>
      <div className="w-full h-80 bg-gray-100 rounded-xl mb-6 overflow-hidden relative z-0">
        <GoogleMap
          center={getCenter()}
          zoom={15}
          draggable={false}
          onLoad={() => setIsMapLoaded(true)}
          className="w-full h-full"
          markers={selectedPlace ? [selectedPlace] : []}
          selectedMarkerId={selectedPlace?.id}
        />

        {selectedPlace && isMapLoaded && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10" style={{ marginTop: '-45px' }}>
            <div className="bg-primary-bg border-2 border-primary rounded-lg px-2 py-1 text-xs text-primary font-medium mb-1 whitespace-nowrap shadow-sm">
              {selectedPlace.displayName.text}
            </div>
          </div>
        )}
      </div>

      <SearchInput
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        onClear={() => {
          setSearchQuery('')
          setSearchTerm('')
          setSelectedPlace(null)
        }}
        onSearch={handleSearch}
        placeholder="장소를 검색하세요"
        containerClassName="mb-4"
      />

      {places.length > 0 && <p className="text-sm text-gray mb-3">검색 결과 ({places.length})</p>}
      {isLoading && <p className="text-sm text-gray mb-3">검색 중...</p>}

      <SearchResultsList ref={listContainerRef} results={places} selectedPlace={selectedPlace} onSelect={setSelectedPlace} />

      <Button onClick={handleNext} disabled={!selectedPlace} size="lg" className="py-4 text-base font-bold">
        장소 선택하기
      </Button>
    </>
  )
}
