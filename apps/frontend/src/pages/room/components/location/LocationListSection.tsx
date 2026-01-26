import { useState } from 'react'
import { ListBoxOutlineIcon, VoteIcon, PlusIcon } from '@/shared/assets'
import { Button, Divider } from '@/shared/ui'
import type { KakaoPlace, PlaceCard } from '@/shared/types'
import { useLocationSearch } from '@/pages/room/hooks'
import { SearchInput } from '@/shared/components/search-input/SearchInput'
import { cn } from '@/shared/utils'
import { RegionSelector } from './region-selector'
import { PlaceDetailModal } from './place-detail'

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

export const LocationListSection = ({
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
}: LocationListSectionProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('locations')
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

        <SearchInput
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onClear={handleClear}
          onSearch={handleSearch}
          placeholder="검색"
        />
      </div>

      <Divider />

      <div className="flex-1 overflow-y-auto p-5">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-gray">검색 중...</div>
        ) : searchResults.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray text-sm">
            {hasSearched ? '검색 결과가 없습니다' : '검색어를 입력하고 Enter를 눌러주세요'}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {searchResults.map((place, index) => {
              const isSelected = pendingPlaceCard?.placeId === String(place.id)

              return (
                <div key={place.id}>
                  <div className="flex gap-3 hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors">
                    <div
                      className="w-24 h-24 bg-gray-200 rounded-lg shrink-0 overflow-hidden cursor-pointer"
                      onClick={() => handlePlaceSelect(place)}
                    >
                      <div className="w-full h-full bg-linear-to-br from-gray-100 to-gray-300" />
                    </div>

                    <div className="flex-1 flex flex-col justify-between py-0.5">
                      <div className="flex flex-col gap-1 cursor-pointer" onClick={() => handlePlaceSelect(place)}>
                        <h3 className="font-bold text-gray-800 text-base line-clamp-1">{place.place_name}</h3>
                        <p className="text-gray text-xs line-clamp-1">{place.category_group_name}</p>
                        <p className="text-gray-400 text-xs line-clamp-1">{place.road_address_name || place.address_name}</p>
                      </div>

                      <div className="flex items-center justify-end gap-2 mt-1">
                        <Button
                          size="sm"
                          icon={<PlusIcon className="size-3" />}
                          onClick={() => handleAddPlaceCard(place)}
                          className={cn(
                            'border transition-colors text-xs gap-1 hover:bg-primary/20 text-primary active:bg-primary/30',
                            isSelected ? 'border-primary bg-white' : 'border-transparent bg-primary-bg',
                          )}
                        >
                          캔버스
                        </Button>
                        <Button variant="gray" size="sm" className="text-xs">
                          후보등록
                        </Button>
                      </div>
                    </div>
                  </div>

                  {index < searchResults.length - 1 && <Divider className="mt-4" />}
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

      {selectedPlace && <PlaceDetailModal place={selectedPlace} onClose={() => handlePlaceSelect(null)} />}
    </div>
  )
}
