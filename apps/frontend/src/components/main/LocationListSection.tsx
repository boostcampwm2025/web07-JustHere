import { useState, useCallback } from 'react'
import { MagnifyIcon, CloseIcon, ListBoxOutlineIcon, VoteIcon, PlusIcon } from '@/components/Icons'
import { searchKeyword } from '@/api/kakao'
import type { KakaoPlace } from '@/types/kakao'
import type { PlaceCard } from '@/types/canvas.types'

interface LocationListSectionProps {
  roomId: string
  pendingPlaceCard: Omit<PlaceCard, 'x' | 'y'> | null
  onStartPlaceCard: (card: Omit<PlaceCard, 'x' | 'y'>) => void
  onCancelPlaceCard: () => void
}

type TabType = 'locations' | 'candidates'

function LocationListSection({ roomId, pendingPlaceCard, onStartPlaceCard, onCancelPlaceCard }: LocationListSectionProps) {
  const [activeTab, setActiveTab] = useState<TabType>('locations')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<KakaoPlace[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return

    setIsLoading(true)
    try {
      const results = await searchKeyword({
        keyword: searchQuery,
        roomId: roomId || 'default',
        radius: 2000,
      })
      setSearchResults(results)
    } catch (error) {
      console.error('검색 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, roomId])

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
      image: null,
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
    <div className="flex flex-col w-96 h-full bg-white border-l border-gray-200">
      {/* Header Section */}
      <div className="flex flex-col gap-4 p-5 pb-4">
        {/* Tab Buttons */}
        <div className="flex gap-2">
          {tabs.map(tab => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-2 px-4 h-9 rounded-lg font-bold text-sm transition-colors ${
                activeTab === tab.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
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
                  <article className="flex gap-3">
                    {/* Thumbnail */}
                    <div className="w-24 h-24 bg-gray-200 rounded-lg shrink-0 overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-300" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col justify-between py-0.5">
                      {/* Top Section */}
                      <div className="flex flex-col gap-1">
                        <h3 className="font-bold text-gray-800 text-base line-clamp-1">{place.place_name}</h3>
                        <p className="text-gray text-xs line-clamp-1">{place.category_group_name}</p>
                        <p className="text-gray-400 text-xs line-clamp-1">{place.road_address_name || place.address_name}</p>
                      </div>

                      {/* Bottom Section */}
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleAddPlaceCard(place)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors ${
                            isSelected ? 'bg-primary/10 border border-primary text-primary' : 'bg-primary-bg text-primary hover:bg-primary/20'
                          }`}
                        >
                          <span className="font-bold text-xs">{isSelected ? '추가됨' : '캔버스'}</span>
                          {!isSelected && <PlusIcon className="w-3 h-3" />}
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1.5 bg-gray-100 text-gray-800 font-bold text-xs rounded-md hover:bg-gray-200 transition-colors"
                        >
                          후보 등록
                        </button>
                      </div>
                    </div>
                  </article>

                  {/* Divider between items */}
                  {index < searchResults.length - 1 && <div className="h-px bg-gray-100 mt-4" />}
                </div>
              )
            })}
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
    </div>
  )
}

export default LocationListSection
