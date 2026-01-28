import { useState } from 'react'
import { ListBoxOutlineIcon, VoteIcon, PlusIcon } from '@/shared/assets'
import { Button, Divider, SearchInput } from '@/shared/components'
import { getPhotoUrl as getGooglePhotoUrl } from '@/shared/api'
import type { GooglePlace, Participant, PlaceCard } from '@/shared/types'
import { useLocationSearch } from '@/pages/room/hooks'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/shared/utils'
import { RegionSelector } from './region-selector'
import { VoteListSection } from './VoteListSection'
import { CandidateListSection } from './CandidateListSection'
import { PlaceDetailModal } from './place-detail'

// 후보 장소 기본 타입 (GooglePlace 기반)
export interface Candidate {
  id: string
  name: string
  category: string
  address: string
  phone?: string
  imageUrl?: string
  rating?: number
  userRatingCount?: number
}

// 투표 중 후보 장소 타입 (투표 정보 포함)
export interface VotingCandidate extends Candidate {
  votePercentage: number
  voters: Participant[]
  hasVoted: boolean
}

// 임시 목데이터 (실제 구현 시 API로 대체)
const mockCandidates: Candidate[] = [
  {
    id: '1',
    name: '스타벅스 스타필드마켓 동탄점',
    category: '카페',
    address: '경기도 화성시 동탄중앙로 376',
    phone: '02-6204-1116',
    imageUrl:
      'https://lh3.googleusercontent.com/gps-cs-s/AHVAweqE90gHnlB1nadfmsbwQ8zhmxLHOIhPHhtcZiS-bmVXTpl0dResvFN43WKuJH-JsYyJiOvNPQ3U_Nva_-wUHeO-AZQurRtvgy3LXYgq451u0_ILGmzxTuGOdvVyHsAMc2CvHYRh=w408-h306-k-no',
    rating: 3.8,
    userRatingCount: 79,
  },
  {
    id: '2',
    name: '양심장어 본점',
    category: '음식점',
    address: '경기도 화성시 동탄중심상가2길 29',
    phone: '02-6204-1116',
    imageUrl: 'https://lh3.googleusercontent.com/p/AF1QipMIshlThUQwycPXSBi3XbJwLaBhkTuKqOSgizW6=w408-h305-k-no',
    rating: 4.9,
    userRatingCount: 108,
  },
  {
    id: '3',
    name: '무궁화1983 동탄점',
    category: '음식점',
    address: '화성시',
    phone: '02-6204-1116',
    imageUrl:
      'https://lh3.googleusercontent.com/gps-cs-s/AHVAweoVQ_eaCKOS0N4sv5tsqM2zCTs4e6RV2YT252e5YB6W7w9Ooay-Y5pYqjYrPgeoCWtVhl-f4Obt4uCRQJICerxfP_D_uW3jKkbcfhjfnOYcY6JzVgNzX51BKNnVcFqmfwUKdoKXDg=w408-h306-k-no',
    rating: 3.8,
    userRatingCount: 89,
  },
]

// 투표 중 목데이터
const mockVotingCandidates: VotingCandidate[] = [
  {
    id: '1',
    name: '스타벅스 강남역점',
    category: '카페',
    address: '서울 강남구 강남대로94길 9',
    phone: '02-6204-1116',
    imageUrl:
      'https://lh3.googleusercontent.com/gps-cs-s/AHVAweqE90gHnlB1nadfmsbwQ8zhmxLHOIhPHhtcZiS-bmVXTpl0dResvFN43WKuJH-JsYyJiOvNPQ3U_Nva_-wUHeO-AZQurRtvgy3LXYgq451u0_ILGmzxTuGOdvVyHsAMc2CvHYRh=w408-h306-k-no',
    rating: 4.2,
    userRatingCount: 1234,
    votePercentage: 75,
    voters: [
      { socketId: 'socketid-1', userId: 'userId1', name: '빨간라면' },
      { socketId: 'socketid-2', userId: 'userId2', name: '파린부대찌개' },
      { socketId: 'socketid-3', userId: 'userId3', name: '초록삼겹살' },
    ],
    hasVoted: true,
  },
  {
    id: '2',
    name: '맛있는 돈까스집',
    category: '음식점',
    address: '서울 강남구 강남대로94길 9',
    phone: '02-6204-1116',
    imageUrl: 'https://lh3.googleusercontent.com/p/AF1QipMIshlThUQwycPXSBi3XbJwLaBhkTuKqOSgizW6=w408-h305-k-no',
    rating: 4.5,
    userRatingCount: 567,
    votePercentage: 50,
    voters: [
      { socketId: 'socketid-4', userId: 'userId4', name: '분홍소세지' },
      { socketId: 'socketid-5', userId: 'userId5', name: '검정초밥' },
    ],
    hasVoted: false,
  },
  {
    id: '3',
    name: '이디야커피 선릉점',
    category: '카페',
    address: '서울 강남구 강남대로94길 9',
    phone: '02-6204-1116',
    imageUrl:
      'https://lh3.googleusercontent.com/gps-cs-s/AHVAweoVQ_eaCKOS0N4sv5tsqM2zCTs4e6RV2YT252e5YB6W7w9Ooay-Y5pYqjYrPgeoCWtVhl-f4Obt4uCRQJICerxfP_D_uW3jKkbcfhjfnOYcY6JzVgNzX51BKNnVcFqmfwUKdoKXDg=w408-h306-k-no',
    rating: 3.8,
    userRatingCount: 89,
    votePercentage: 25,
    voters: [{ socketId: 'socketid-6', userId: 'userId6', name: '주황버섯' }],
    hasVoted: false,
  },
]

interface LocationListSectionProps {
  roomId: string
  slug: string
  currentRegion?: string | null
  onRegionChange?: (region: { x: number; y: number; place_name: string }) => void
  pendingPlaceCard: Omit<PlaceCard, 'x' | 'y'> | null
  onStartPlaceCard: (card: Omit<PlaceCard, 'x' | 'y'>) => void
  onCancelPlaceCard: () => void
  onSearchComplete?: (results: GooglePlace[]) => void
  selectedPlace: GooglePlace | null
  onPlaceSelect: (place: GooglePlace | null) => void
}

type TabType = 'locations' | 'candidates'

const getPhotoUrl = (place: GooglePlace) => {
  if (!place.photos || place.photos.length === 0) return null
  return getGooglePhotoUrl(place.photos[0].name, 200)
}

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
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabType>('locations')
  // 임시 투표 상태 > socket 연동 후 제거 예정
  const [isVoting, setIsVoting] = useState(false)
  const { searchQuery, setSearchQuery, searchResults, isLoading, isFetchingMore, hasMore, hasSearched, handleSearch, loadMoreRef } =
    useLocationSearch({
      roomId,
      onSearchComplete,
    })

  const handlePlaceSelect = (place: GooglePlace | null) => {
    onPlaceSelect(place)
  }

  const handleClear = () => {
    setSearchQuery('')
  }

  const handleAddPlaceCard = (place: GooglePlace) => {
    if (pendingPlaceCard?.placeId === place.id) {
      onCancelPlaceCard()
      return
    }

    onStartPlaceCard({
      id: `placeCard-${crypto.randomUUID()}`,
      placeId: place.id,
      name: place.displayName.text,
      address: place.formattedAddress,
      createdAt: new Date().toISOString(),
      scale: 1,
      image: getPhotoUrl(place),
      category: place.primaryTypeDisplayName?.text || '',
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

          {/* Region Selector - 장소 리스트 탭에서만 표시 */}
          {activeTab === 'locations' && (
            <div className="ml-auto">
              <RegionSelector currentRegion={currentRegion} slug={slug} onRegionChange={onRegionChange} />
            </div>
          )}
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
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-gray">검색 중...</div>
        ) : searchResults.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray text-sm">
            {hasSearched ? '검색 결과가 없습니다' : '검색어를 입력하고 Enter를 눌러주세요'}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {searchResults.map((place, index) => {
              const isSelected = pendingPlaceCard?.placeId === place.id
              const photoUrl = getPhotoUrl(place)

              return (
                <div key={place.id}>
                  <div className="flex gap-3 hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors">
                    <div
                      className="w-24 h-24 bg-gray-200 rounded-lg shrink-0 overflow-hidden cursor-pointer"
                      onClick={() => handlePlaceSelect(place)}
                    >
                      {photoUrl ? (
                        <img src={photoUrl} alt={place.displayName.text} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-linear-to-br from-gray-100 to-gray-300 flex items-center justify-center">
                          <span className="text-gray-400 text-xs">No Image</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col justify-between py-0.5">
                      <div className="flex flex-col gap-1 cursor-pointer" onClick={() => handlePlaceSelect(place)}>
                        <h3 className="font-bold text-gray-800 text-base line-clamp-1">{place.displayName.text}</h3>
                        <div className="flex items-center gap-2">
                          {place.rating && (
                            <span className="text-xs text-yellow-500 flex items-center gap-0.5">
                              ★ {place.rating.toFixed(1)}
                              {place.userRatingCount && <span className="text-gray-400">({place.userRatingCount})</span>}
                            </span>
                          )}
                          {place.primaryTypeDisplayName && <span className="text-gray text-xs">{place.primaryTypeDisplayName.text}</span>}
                        </div>
                        <p className="text-gray-400 text-xs line-clamp-1">{place.formattedAddress}</p>
                        {place.regularOpeningHours && (
                          <span className={cn('text-xs w-fit', place.regularOpeningHours.openNow ? 'text-green-600' : 'text-red-500')}>
                            {place.regularOpeningHours.openNow ? '영업 중' : '영업 종료'}
                          </span>
                        )}
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

      {/* 후보 리스트 탭 */}
      {activeTab === 'candidates' &&
        (isVoting ? (
          <VoteListSection candidates={mockVotingCandidates} onEndVote={() => navigate(`/result/${slug}`)} />
        ) : (
          <CandidateListSection candidates={mockCandidates} onStartVote={() => setIsVoting(true)} />
        ))}

      {/* Place Detail Modal */}
      {selectedPlace && <PlaceDetailModal place={selectedPlace} onClose={() => handlePlaceSelect(null)} />}
    </div>
  )
}
