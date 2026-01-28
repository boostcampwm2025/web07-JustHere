import { PlaceDetailContent } from '@/shared/components'
import { useGooglePlaceDetails } from '@/shared/hooks'
import type { GooglePlace } from '@/shared/types'

interface PlaceResultCardProps {
  place: GooglePlace
}

export const PlaceResultCard = ({ place }: PlaceResultCardProps) => {
  const { data: placeDetails, isLoading } = useGooglePlaceDetails(place.id)

  if (isLoading) {
    return (
      <div className="flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden max-w-md shrink-0 h-full">
        <div className="flex-1 flex items-center justify-center">
          <span className="text-gray-500">로딩 중...</span>
        </div>
      </div>
    )
  }

  if (!placeDetails) {
    return (
      <div className="flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden max-w-md shrink-0 h-full">
        <div className="flex-1 flex items-center justify-center">
          <span className="text-gray-500">장소 정보를 불러올 수 없습니다</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden max-w-md shrink-0 h-full">
      <PlaceDetailContent place={placeDetails} />
    </div>
  )
}
