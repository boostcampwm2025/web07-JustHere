import React from 'react'
import { PlaceListItem } from '@/pages/room/components/location'
import { Divider } from '@/shared/components'
import type { KakaoPlace, PlaceCard, Candidate } from '@/shared/types'

interface LocationSearchResultsProps {
  isLoading: boolean
  searchResults: KakaoPlace[]
  hasSearched: boolean
  hasMore: boolean
  isFetchingMore: boolean
  loadMoreRef: React.RefObject<HTMLDivElement | null>
  pendingPlaceCard: Omit<PlaceCard, 'x' | 'y'> | null
  candidates: Candidate[]
  onPlaceSelect: (place: KakaoPlace) => void
  onAddCanvas: (place: KakaoPlace) => void
  onToggleCandidate: (place: KakaoPlace) => void
}

export const LocationSearchResults = ({
  isLoading,
  searchResults,
  hasSearched,
  hasMore,
  isFetchingMore,
  loadMoreRef,
  pendingPlaceCard,
  candidates,
  onPlaceSelect,
  onAddCanvas,
  onToggleCandidate,
}: LocationSearchResultsProps) => {
  if (isLoading) {
    return <div className="flex items-center justify-center h-32 text-gray">검색 중...</div>
  }

  if (searchResults.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray text-sm">
        {hasSearched ? '검색 결과가 없습니다' : '검색어를 입력하고 Enter를 눌러주세요'}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {searchResults.map((place, index) => (
        <div key={place.id}>
          <PlaceListItem
            place={place}
            isSelected={pendingPlaceCard?.placeId === String(place.id)}
            isCandidate={candidates.some(c => c.id === String(place.id))}
            onSelect={onPlaceSelect}
            onAddCanvas={onAddCanvas}
            onToggleCandidate={onToggleCandidate}
          />
          {index < searchResults.length - 1 && <Divider className="mt-4" />}
        </div>
      ))}
      <div ref={loadMoreRef} />
      {isFetchingMore && <div className="text-center text-xs text-gray">더 불러오는 중...</div>}
      {!hasMore && <div className="text-center text-xs text-gray-400">모든 결과를 불러왔어요</div>}
    </div>
  )
}
