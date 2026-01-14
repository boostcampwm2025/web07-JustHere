import { useRef, useEffect, useState } from 'react'
import { MapMarker } from 'react-kakao-maps-sdk'
import { searchKeyword } from '@/api/kakao'
import { Button } from '@/components/common/Button'
import { SearchInput } from '@/components/common/SearchInput'
import { SearchResultsList } from '@/components/onboarding/SearchResultsList'
import KakaoMap from '@/components/KakaoMap'
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress'
import type { KakaoPlace } from '@/types/kakao'

interface LocationStepProps {
  onNext: (location: { name: string; address: string }) => void
}

function LocationStep({ onNext }: LocationStepProps) {
  const [searchQuery, setSearchQuery] = useState('강남역')
  const [searchResults, setSearchResults] = useState<KakaoPlace[]>([])
  const [selectedPlace, setSelectedPlace] = useState<KakaoPlace | null>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)

  const listContainerRef = useRef<HTMLDivElement>(null)

  const defaultCenter = { lat: 37.498095, lng: 127.02761 }

  const getCenter = () => {
    if (selectedPlace) {
      return { lat: Number(selectedPlace.y), lng: Number(selectedPlace.x) }
    }
    return defaultCenter
  }

  const handleSearch = async () => {
    const trimmedQuery = searchQuery.trim()
    if (!trimmedQuery) {
      setSearchResults([])
      setSelectedPlace(null)
      return
    }

    try {
      const result = await searchKeyword(trimmedQuery)
      setSearchResults(result)
    } catch (error) {
      console.error('키워드 검색 실패', error)
      setSearchResults([])
    }
  }

  useEffect(() => {
    if (listContainerRef.current) {
      listContainerRef.current.scrollTop = 0
    }
  }, [searchResults])

  const handleNext = () => {
    if (selectedPlace) {
      onNext({
        name: selectedPlace.place_name,
        address: selectedPlace.road_address_name || selectedPlace.address_name,
      })
    }
  }

  return (
    <main className="flex-1 flex items-start justify-center px-4 py-16">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-sm p-12">
        <OnboardingProgress currentStep="location" />

        <h1 className="text-2xl font-medium text-black text-center mb-8">만날 지역을 선택해보세요</h1>
        <div className="w-full h-80 bg-gray-100 rounded-xl mb-6 overflow-hidden relative z-0">
          <KakaoMap center={getCenter()} level={3} draggable={false} onLoad={() => setIsMapLoaded(true)} className="w-full h-full">
            {selectedPlace && <MapMarker position={getCenter()} />}
          </KakaoMap>

          {selectedPlace && isMapLoaded && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10" style={{ marginTop: '-45px' }}>
              <div className="bg-primary-bg border-2 border-primary rounded-lg px-2 py-1 text-xs text-primary font-medium mb-1 whitespace-nowrap shadow-sm">
                {selectedPlace.place_name}
              </div>
            </div>
          )}
        </div>

        <SearchInput
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onClear={() => {
            setSearchQuery('')
            setSearchResults([])
            setSelectedPlace(null)
          }}
          onSearch={handleSearch}
          placeholder="장소를 검색하세요"
          containerClassName="mb-2"
        />

        <p className="text-sm text-gray mb-3">검색 결과 ({searchResults.length})</p>

        <SearchResultsList ref={listContainerRef} results={searchResults} selectedPlace={selectedPlace} onSelect={setSelectedPlace} />

        <Button onClick={handleNext} disabled={!selectedPlace} size="lg" className="py-4 text-base font-bold">
          참여자 초대하기
        </Button>
      </div>
    </main>
  )
}

export default LocationStep
