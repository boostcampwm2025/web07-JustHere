import { type KeyboardEvent } from 'react'
import { PlusIcon, CheckIcon } from '@/shared/assets'
import { Button, Divider } from '@/shared/components'
import { LazyImage } from '@/shared/components/lazy-image'
import type { GooglePlace } from '@/shared/types'
import { cn } from '@/shared/utils'

interface PlaceItemProps {
  place: GooglePlace
  isSelected: boolean
  photoUrl: string | null | undefined
  isAlreadyCandidate: boolean
  canRegisterCandidate: boolean
  showDivider: boolean
  onPlaceSelect: (place: GooglePlace) => void
  onAddPlaceCard: (place: GooglePlace) => void
  onRegisterCandidate: (place: GooglePlace) => void
  onRemoveCandidate: (candidateId: string) => void
}

export const PlaceItem = ({
  place,
  isSelected,
  photoUrl,
  isAlreadyCandidate,
  canRegisterCandidate,
  showDivider,
  onPlaceSelect,
  onAddPlaceCard,
  onRegisterCandidate,
  onRemoveCandidate,
}: PlaceItemProps) => {
  return (
    <div>
      <div
        className="flex gap-3 hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors cursor-pointer"
        onClick={() => onPlaceSelect(place)}
        role="button"
        tabIndex={0}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onPlaceSelect(place)
          }
        }}
      >
        <div className="w-24 h-24 bg-gray-200 rounded-lg shrink-0 overflow-hidden cursor-pointer">
          {photoUrl ? (
            <LazyImage src={photoUrl} alt={place.displayName.text} className="w-full h-full" />
          ) : (
            <div className="w-full h-full bg-linear-to-br from-gray-100 to-gray-300 flex items-center justify-center">
              <span className="text-gray-400 text-xs">No Image</span>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col justify-between py-0.5">
          <div className="flex flex-col gap-1">
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
              onClick={event => {
                event.stopPropagation()
                onAddPlaceCard(place)
              }}
              className={cn(
                'border transition-colors text-xs gap-1 hover:bg-primary/20 text-primary active:bg-primary/30',
                isSelected ? 'border-primary bg-white' : 'border-transparent bg-primary-bg',
              )}
            >
              캔버스
            </Button>
            <Button
              variant={isAlreadyCandidate ? 'gray' : 'outline'}
              icon={isAlreadyCandidate && <CheckIcon className="size-3" />}
              size="sm"
              className="text-xs"
              onClick={event => {
                event.stopPropagation()
                if (isAlreadyCandidate) {
                  onRemoveCandidate(place.id)
                  return
                }
                onRegisterCandidate(place)
              }}
              disabled={!canRegisterCandidate}
            >
              {isAlreadyCandidate ? '담김' : '후보등록'}
            </Button>
          </div>
        </div>
      </div>
      {showDivider && <Divider className="mt-4" />}
    </div>
  )
}
