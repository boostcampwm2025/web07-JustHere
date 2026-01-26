import { PlusIcon } from '@/shared/assets'
import { Button } from '@/shared/components'
import type { KakaoPlace, Candidate } from '@/shared/types'
import { cn } from '@/shared/utils'

interface PlaceListItemProps {
  place: KakaoPlace | Candidate
  isSelected: boolean // 캔버스 배치 대기 상태인지
  isCandidate: boolean // 후보 리스트에 포함되어 있는지
  onSelect: (place: KakaoPlace) => void
  onAddCanvas: (place: KakaoPlace) => void
  onToggleCandidate: (place: KakaoPlace) => void
}

export const PlaceListItem = ({ place, isSelected, isCandidate, onSelect, onAddCanvas, onToggleCandidate }: PlaceListItemProps) => {
  return (
    <div>
      <div className="flex gap-3 hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors">
        <div className="w-24 h-24 bg-gray-200 rounded-lg shrink-0 overflow-hidden cursor-pointer" onClick={() => onSelect(place)}>
          <div className="w-full h-full bg-linear-to-br from-gray-100 to-gray-300" />
        </div>

        <div className="flex-1 flex flex-col justify-between py-0.5">
          <div className="flex flex-col gap-1 cursor-pointer" onClick={() => onSelect(place)}>
            <h3 className="font-bold text-gray-800 text-base line-clamp-1">{place.place_name}</h3>
            <p className="text-gray text-xs line-clamp-1">{place.category_group_name}</p>
            <p className="text-gray-400 text-xs line-clamp-1">{place.road_address_name || place.address_name}</p>
          </div>

          <div className="flex items-center justify-end gap-2 mt-1">
            <Button
              size="sm"
              icon={<PlusIcon className="size-3" />}
              onClick={() => onAddCanvas(place)}
              className={cn(
                'border transition-colors text-xs gap-1 hover:bg-primary/20 text-primary active:bg-primary/30',
                isSelected ? 'border-primary bg-white' : 'border-transparent bg-primary-bg',
              )}
            >
              캔버스
            </Button>
            <Button
              variant={isCandidate ? 'primary' : 'gray'}
              size="sm"
              className={cn('text-xs', isCandidate && 'text-white')}
              onClick={() => onToggleCandidate(place)}
            >
              {isCandidate ? '담김' : '후보등록'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
