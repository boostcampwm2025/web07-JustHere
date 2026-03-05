import { useCallback, useMemo } from 'react'
import { getPhotoUrl as getGooglePhotoUrl } from '@/shared/api'
import { useGooglePhotos } from '@/shared/hooks/queries/useGoogleQueries'
import type { GooglePlace, PlaceCard } from '@/shared/types'
import { reportError } from '@/shared/utils'
import { PLACE_CARD_HEIGHT, PLACE_CARD_WIDTH } from '@/pages/room/constants'
import type { VoteCandidateAddPayload } from '@/pages/room/types/vote/types'
import { PlaceItem } from './PlaceItem'
import { PlaceItemSkeleton } from './PlaceItemSkeleton'

interface PlaceListProps {
  searchResults: GooglePlace[]
  isLoading: boolean
  isFetchingMore: boolean
  hasMore: boolean
  hasSearched: boolean
  loadMoreRef: React.RefObject<HTMLDivElement | null>
  pendingPlaceCard: Omit<PlaceCard, 'x' | 'y'> | null
  onStartPlaceCard: (card: Omit<PlaceCard, 'x' | 'y'>) => void
  onCancelPlaceCard: () => void
  candidatePlaceIds: string[]
  canRegisterCandidate: boolean
  onPlaceSelect: (place: GooglePlace | null) => void
  onAddCandidate: (input: Omit<VoteCandidateAddPayload, 'roomId' | 'categoryId'>) => void
  onRemoveCandidate: (candidateId: string) => void
}

export const PlaceList = ({
  searchResults,
  isLoading,
  isFetchingMore,
  hasMore,
  hasSearched,
  loadMoreRef,
  pendingPlaceCard,
  onStartPlaceCard,
  onCancelPlaceCard,
  candidatePlaceIds,
  canRegisterCandidate,
  onPlaceSelect,
  onAddCandidate,
  onRemoveCandidate,
}: PlaceListProps) => {
  const photoNames = useMemo(() => searchResults.map(place => place.photos?.[0]?.name), [searchResults])
  const photoQueries = useGooglePhotos(photoNames, 200, 200)

  const photoUrls = useMemo(() => {
    const urls: Record<string, string | null> = {}
    searchResults.forEach((place, index) => {
      urls[place.id] = photoQueries[index]?.data ?? null
    })
    return urls
  }, [searchResults, photoQueries])

  const handleCandidateRegister = useCallback(
    async (place: GooglePlace) => {
      let imageUrl: string | undefined = photoUrls[place.id] ?? undefined

      if (!imageUrl && place.photos && place.photos.length > 0) {
        try {
          imageUrl = (await getGooglePhotoUrl(place.photos[0].name, 200)) ?? undefined
        } catch (error) {
          reportError({ error, code: 'CLIENT_UNKNOWN', context: { placeId: place.id, source: 'handleCandidateRegister' } })
        }
      }

      onAddCandidate({
        placeId: place.id,
        name: place.displayName.text,
        address: place.formattedAddress,
        category: place.primaryTypeDisplayName?.text,
        imageUrl,
        rating: place.rating,
        ratingCount: place.userRatingCount,
      })
    },
    [onAddCandidate, photoUrls],
  )

  const handleAddPlaceCard = useCallback(
    async (place: GooglePlace) => {
      if (pendingPlaceCard?.placeId === place.id) {
        onCancelPlaceCard()
        return
      }

      let imageUrl: string | null = photoUrls[place.id] ?? null

      if (!imageUrl && place.photos && place.photos.length > 0) {
        try {
          imageUrl = await getGooglePhotoUrl(place.photos[0].name, 200)
        } catch (error) {
          reportError({ error, code: 'CLIENT_UNKNOWN', context: { placeId: place.id, source: 'handleAddPlaceCard' } })
        }
      }

      onStartPlaceCard({
        id: `placeCard-${crypto.randomUUID()}`,
        placeId: place.id,
        name: place.displayName.text,
        address: place.formattedAddress,
        createdAt: new Date().toISOString(),
        scale: 1,
        image: imageUrl,
        category: place.primaryTypeDisplayName?.text || '',
        width: PLACE_CARD_WIDTH,
        height: PLACE_CARD_HEIGHT,
        rating: place.rating,
        userRatingCount: place.userRatingCount,
      })
    },
    [pendingPlaceCard, onCancelPlaceCard, onStartPlaceCard, photoUrls],
  )

  return (
    <div className="flex-1 overflow-y-auto p-5">
      {isLoading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 10 }).map((_, index) => (
            <PlaceItemSkeleton key={index} />
          ))}
        </div>
      ) : searchResults.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-gray text-sm">
          {hasSearched ? '검색 결과가 없습니다' : '검색어를 입력하고 Enter를 눌러주세요'}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {searchResults.map((place, index) => (
            <PlaceItem
              key={place.id}
              place={place}
              isSelected={pendingPlaceCard?.placeId === place.id}
              photoUrl={photoUrls[place.id]}
              isAlreadyCandidate={candidatePlaceIds.includes(place.id)}
              canRegisterCandidate={canRegisterCandidate}
              showDivider={index < searchResults.length - 1}
              onPlaceSelect={onPlaceSelect}
              onAddPlaceCard={handleAddPlaceCard}
              onRegisterCandidate={handleCandidateRegister}
              onRemoveCandidate={onRemoveCandidate}
            />
          ))}
          <div ref={loadMoreRef} />
          {isFetchingMore && <div className="text-center text-xs text-gray">더 불러오는 중...</div>}
          {!hasMore && searchResults.length > 0 && !isLoading && !isFetchingMore && (
            <div className="text-center text-xs text-gray-400">모든 결과를 불러왔어요</div>
          )}
        </div>
      )}
    </div>
  )
}
