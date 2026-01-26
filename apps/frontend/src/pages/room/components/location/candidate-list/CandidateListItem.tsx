import { CloseIcon, CreationIcon, MapMarkerIcon, PhoneIcon } from '@/shared/assets'
import type { Candidate } from '@/shared/types'
import { cn } from '@/shared/utils'

interface CandidateItemProps {
  place: Candidate
  isSelected: boolean
  onClick: () => void
  onRemove: () => void
}

export const CandidateListItem = ({ place, isSelected, onClick, onRemove }: CandidateItemProps) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'relative flex flex-col gap-2 p-4 rounded-xl border bg-white cursor-pointer transition-all hover:shadow-sm',
        isSelected ? 'border-primary ring-1 ring-primary' : 'border-gray-200 hover:border-gray-300',
      )}
    >
      {/* Header: Title & Badge & Close Button */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 pr-6">
          <h4 className="font-bold text-gray-900 text-[15px] leading-tight line-clamp-1">{place.place_name}</h4>
          {place.distance && (
            <span className="shrink-0 px-1.5 py-[2px] text-[10px] font-medium text-red-500 border border-red-200 rounded-[4px] bg-white">
              {place.distance}m
            </span>
          )}
        </div>

        {/* 우측 상단 삭제 버튼 */}
        <button
          type="button"
          onClick={e => {
            e.stopPropagation() // 카드 클릭 이벤트 방지
            onRemove()
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="삭제"
        >
          <CloseIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1.5 mt-1">
        {/* 카테고리 */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-4 flex justify-center shrink-0">
            <CreationIcon className="w-3.5 h-3.5" />
          </div>
          <span className="truncate">{place.category_name}</span>
        </div>

        {/* 주소 */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-4 flex justify-center shrink-0">
            <MapMarkerIcon className="w-3.5 h-3.5" />
          </div>
          <span className="truncate">{place.road_address_name || place.address_name}</span>
        </div>

        {/* 전화번호 (있을 경우만) */}
        {place.phone && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-4 flex justify-center shrink-0">
              <PhoneIcon className="w-3.5 h-3.5" />
            </div>
            <span className="truncate">{place.phone}</span>
          </div>
        )}
      </div>
    </div>
  )
}
