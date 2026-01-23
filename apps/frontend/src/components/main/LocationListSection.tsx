import { useState } from 'react'
import { MagnifyIcon, CloseIcon, ListBoxOutlineIcon, VoteIcon, PlusIcon } from '@/components/Icons'
import { cn } from '@/utils/cn'
import type { KakaoPlace } from '@/types/kakao'
import type { PlaceCard } from '@/types/canvas.types'
import PlaceDetailModal from './PlaceDetailModal'
import RegionSelector from './RegionSelector'
import { useLocationSearch } from '@/hooks/useLocationSearch'

interface LocationListSectionProps {
  roomId: string
  slug: string
  currentRegion?: string | null
  onRegionChange?: (region: { x: number; y: number; place_name: string }) => void
  pendingPlaceCard: Omit<PlaceCard, 'x' | 'y'> | null
  onStartPlaceCard: (card: Omit<PlaceCard, 'x' | 'y'>) => void
  onCancelPlaceCard: () => void
  onSearchComplete?: (results: KakaoPlace[]) => void
  selectedPlace: KakaoPlace | null
  onPlaceSelect: (place: KakaoPlace | null) => void
}

type TabType = 'locations' | 'candidates'

function LocationListSection({
  roomId,
  slug,
  currentRegion,
  onRegionChange,
  pendingPlaceCard,
  onStartPlaceCard,
  onCancelPlaceCard,
  onSearchComplete,
  selectedPlace,
  onPlaceSelect,
}: LocationListSectionProps) {
  const [activeTab, setActiveTab] = useState<TabType>('locations')
  const { searchQuery, setSearchQuery, searchResults, isLoading, isFetchingMore, hasMore, handleSearch, loadMoreRef } = useLocationSearch({
    roomId,
    onSearchComplete,
  })

  const handlePlaceSelect = (place: KakaoPlace | null) => {
    onPlaceSelect(place)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

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
      {/* Header Section */}
      <div className="flex flex-col gap-4 p-5 pb-4">
        {/* Tab Buttons */}
        <div className="flex items-center gap-2">
          {tabs.map(tab => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center justify-center gap-2 px-4 h-9 rounded-lg font-bold text-sm transition-colors shrink-0',
                activeTab === tab.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200',
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}

          {/* Region Selector */}
          <div className="ml-auto">
            <RegionSelector currentRegion={currentRegion} slug={slug} onRegionChange={onRegionChange} />
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <MagnifyIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="검색"
            className="w-full h-12 pl-10 pr-10 bg-gray-bg border border-gray-300 rounded-xl text-sm text-black placeholder:text-gray-disable focus:outline-none focus:border-primary"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray hover:text-black"
              aria-label="검색어 지우기"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-100" />

      {/* Location List */}
      <div className="flex-1 overflow-y-auto p-5">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-gray">검색 중...</div>
        ) : searchResults.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray text-sm">검색어를 입력하고 Enter를 눌러주세요</div>
        ) : (
          <div className="flex flex-col gap-4">
            {searchResults.map((place, index) => {
              const isSelected = pendingPlaceCard?.placeId === String(place.id)

              return (
                <div key={place.id}>
                  <div className="flex gap-3 hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors">
                    {/* Thumbnail */}
                    <div
                      className="w-24 h-24 bg-gray-200 rounded-lg shrink-0 overflow-hidden cursor-pointer"
                      onClick={() => handlePlaceSelect(place)}
                    >
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-300" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col justify-between py-0.5">
                      {/* Top Section */}
                      <div className="flex flex-col gap-1 cursor-pointer" onClick={() => handlePlaceSelect(place)}>
                        <h3 className="font-bold text-gray-800 text-base line-clamp-1">{place.place_name}</h3>
                        <p className="text-gray text-xs line-clamp-1">{place.category_group_name}</p>
                        <p className="text-gray-400 text-xs line-clamp-1">{place.road_address_name || place.address_name}</p>
                      </div>

                      {/* Bottom Section */}
                      <div className="flex items-center justify-end gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => handleAddPlaceCard(place)}
                          className={cn(
                            'flex items-center gap-1 px-3 py-1.5 rounded-md border transition-colors text-primary',
                            isSelected ? 'border-primary bg-white' : 'border-transparent bg-primary-bg hover:bg-primary/20',
                          )}
                        >
                          <span className="font-bold text-xs">캔버스</span>
                          <PlusIcon className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1.5 bg-gray-100 text-gray-800 font-bold text-xs rounded-md hover:bg-gray-200 transition-colors"
                        >
                          후보 등록
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Divider between items */}
                  {index < searchResults.length - 1 && <div className="h-px bg-gray-100 mt-4" />}
                </div>
              )
            })}
            <div ref={loadMoreRef} />
            {isFetchingMore && <div className="text-center text-xs text-gray">더 불러오는 중...</div>}
            {!hasMore && searchResults.length > 0 && !isLoading && !isFetchingMore && (
              <div className="text-center text-xs text-gray-400">모든 결과를 불러왔어요</div>
            )}
          </div>
        )}
      </div>

      {/* Footer Button */}
      <div className="p-5 pt-0">
        <button
          type="button"
          className="w-full flex items-center justify-center gap-1.5 px-5 py-3 bg-primary hover:bg-primary-pressed text-white font-semibold rounded-full transition-colors"
        >
          장소 목록 뽑기~
        </button>
      </div>

      {/* Place Detail Modal */}
      <PlaceDetailModal place={selectedPlace} onClose={() => handlePlaceSelect(null)} />
    </div>
  )
}

export default LocationListSection
