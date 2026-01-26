import { CandidateListItem } from '@/pages/room/components/location'
import type { KakaoPlace } from '@/shared/types'
import type { PlaceCard } from '@/shared/types/canvas.types.ts'
import type { Candidate } from '@/shared/types/location.types.ts'

interface CandidateListProps {
  candidates: Candidate[]
  pendingPlaceCard: Omit<PlaceCard, 'x' | 'y'> | null
  onPlaceSelect: (place: KakaoPlace) => void
  onAddCanvas: (place: KakaoPlace) => void
  onRemoveCandidate: (placeId: string) => void
}

export const CandidateList = ({ candidates, pendingPlaceCard, onPlaceSelect, onRemoveCandidate }: CandidateListProps) => {
  if (candidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray text-sm gap-2">
        <p>등록된 후보 장소가 없습니다.</p>
        <p className="text-xs text-gray-400">장소 리스트에서 검색 후 추가해보세요!</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 pb-4">
      {candidates.map(place => (
        <CandidateListItem
          key={place.id}
          place={place}
          isSelected={pendingPlaceCard?.placeId === String(place.id)}
          onClick={() => onPlaceSelect(place)}
          onRemove={() => onRemoveCandidate(place.id)}
        />
      ))}
    </div>
  )
}
