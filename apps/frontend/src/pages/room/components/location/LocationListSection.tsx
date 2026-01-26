import { LocationSearchResults, CandidateList } from '@/pages/room/components/location'
import { useState } from 'react'
import { ListBoxOutlineIcon, VoteIcon } from '@/shared/assets'
import { Button, Divider, SearchInput } from '@/shared/components'
import type { Candidate, KakaoPlace, PlaceCard } from '@/shared/types'
import { useLocationSearch } from '@/pages/room/hooks'
import { cn } from '@/shared/utils'
import { RegionSelector } from './region-selector'
import { PlaceDetailModal } from './place-detail'
import { useYjsSocket } from '@/pages/room/hooks/useYjsSocket' // 경로 확인 필요
import { getOrCreateStoredUser } from '@/shared/utils/userStorage' // 경로 확인 필요

interface LocationListSectionProps {
  roomId: string
  slug: string
  currentRegion?: string | null
  activeCategoryId: string // [New] 상위에서 전달받은 활성 카테고리 ID
  onRegionChange?: (region: { x: number; y: number; place_name: string }) => void
  pendingPlaceCard: Omit<PlaceCard, 'x' | 'y'> | null
  onStartPlaceCard: (card: Omit<PlaceCard, 'x' | 'y'>) => void
  onCancelPlaceCard: () => void
  onSearchComplete?: (results: KakaoPlace[]) => void
  selectedPlace: KakaoPlace | null
  onPlaceSelect: (place: KakaoPlace | null) => void
}

type TabType = 'locations' | 'candidates'

export const LocationListSection = ({
  roomId,
  slug,
  currentRegion,
  activeCategoryId,
  onRegionChange,
  pendingPlaceCard,
  onStartPlaceCard,
  onCancelPlaceCard,
  onSearchComplete,
  selectedPlace,
  onPlaceSelect,
}: LocationListSectionProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('locations')

  // 유저 정보 (후보 등록자 표시용)
  const user = getOrCreateStoredUser(slug)

  // Y.js Hook 연결
  const { candidates, addCandidate, removeCandidate } = useYjsSocket({
    roomId,
    canvasId: activeCategoryId,
    userName: user?.name || 'Unknown',
  })

  // 검색 Hook 연결
  const { searchQuery, setSearchQuery, searchResults, isLoading, isFetchingMore, hasMore, hasSearched, handleSearch, loadMoreRef } =
    useLocationSearch({
      roomId,
      onSearchComplete,
    })

  const handlePlaceSelect = (place: KakaoPlace | null) => {
    onPlaceSelect(place)
  }

  const handleClear = () => {
    setSearchQuery('')
  }

  // 캔버스 배치 카드 생성 핸들러
  const handleAddPlaceCard = (place: KakaoPlace) => {
    if (pendingPlaceCard?.placeId === String(place.id)) {
      onCancelPlaceCard()
      return
    }

    onStartPlaceCard({
      id: `placeCard-${crypto.randomUUID()}`,
      placeId: String(place.id),
      name: place.place_name,
      address: place.road_address_name || place.address_name,
      createdAt: new Date().toISOString(),
      scale: 1,
      image: null,
      category: place.category_group_name,
    })
  }

  // 후보 등록/삭제 토글 핸들러
  const handleToggleCandidate = (place: KakaoPlace) => {
    if (!activeCategoryId) {
      alert('카테고리를 먼저 선택하거나 생성해주세요.')
      return
    }

    const isAlreadyCandidate = candidates.some(c => c.id === String(place.id))

    if (isAlreadyCandidate) {
      removeCandidate(String(place.id))
    } else {
      // KakaoPlace -> Candidate 변환
      const candidateData: Candidate = {
        ...place,
        id: String(place.id), // ID 타입 안전성 확보
        addedBy: user?.name,
      }
      addCandidate(candidateData)
    }
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    {
      id: 'locations',
      label: '장소 리스트',
      icon: <ListBoxOutlineIcon className="w-4 h-4" />,
    },
    {
      id: 'candidates',
      label: '후보 리스트',
      icon: <VoteIcon className="w-4 h-4" />,
    },
  ]

  return (
    <div className="flex flex-col w-[420px] h-full bg-white border-l border-gray-200">
      <div className="flex flex-col gap-4 p-5 pb-4">
        <div className="flex items-center gap-2">
          {tabs.map(tab => (
            <Button
              key={tab.id}
              icon={tab.icon}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'text-sm px-0 flex-1 whitespace-nowrap',
                activeTab === tab.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200',
              )}
            >
              {tab.label}
            </Button>
          ))}

          <div className="flex-1">
            <RegionSelector currentRegion={currentRegion} slug={slug} onRegionChange={onRegionChange} />
          </div>
        </div>

        {activeTab === 'locations' && (
          <SearchInput
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onClear={handleClear}
            onSearch={handleSearch}
            placeholder="검색"
          />
        )}
      </div>

      <Divider />

      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === 'locations' ? (
          <LocationSearchResults
            isLoading={isLoading}
            searchResults={searchResults}
            hasSearched={hasSearched}
            hasMore={hasMore}
            isFetchingMore={isFetchingMore}
            loadMoreRef={loadMoreRef}
            pendingPlaceCard={pendingPlaceCard}
            candidates={candidates}
            onPlaceSelect={handlePlaceSelect}
            onAddCanvas={handleAddPlaceCard}
            onToggleCandidate={handleToggleCandidate}
          />
        ) : (
          <CandidateList
            candidates={candidates}
            pendingPlaceCard={pendingPlaceCard}
            onPlaceSelect={handlePlaceSelect}
            onAddCanvas={handleAddPlaceCard}
            onRemoveCandidate={removeCandidate}
          />
        )}
      </div>

      {selectedPlace && <PlaceDetailModal place={selectedPlace} onClose={() => handlePlaceSelect(null)} />}
    </div>
  )
}
