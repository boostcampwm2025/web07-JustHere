import { forwardRef } from 'react'
import { CheckIcon } from '@/shared/ui/icons/Icons'
import { cn } from '@/shared/utils/cn'
import type { KakaoPlace } from '@/shared/types/kakao'

interface SearchResultsListProps {
  results: KakaoPlace[]
  selectedPlace: KakaoPlace | null
  onSelect: (place: KakaoPlace) => void
}

export const SearchResultsList = forwardRef<HTMLDivElement, SearchResultsListProps>(({ results, selectedPlace, onSelect }, ref) => {
  return (
    <div ref={ref} className="flex flex-col gap-3 mb-6 max-h-[300px] overflow-y-auto custom-scrollbar">
      {results.map(result => {
        const isSelected = selectedPlace?.id === result.id
        return (
          <button
            key={result.id}
            onClick={() => onSelect(result)}
            className={cn('flex items-center justify-between px-5 py-4 rounded-xl border transition-colors text-left w-full shrink-0', {
              'bg-primary-bg border-primary': isSelected,
              'bg-white border-gray-300 hover:border-gray': !isSelected,
            })}
          >
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-black">{result.place_name}</span>
              <span className="text-xs text-gray">{result.road_address_name || result.address_name}</span>
            </div>
            {isSelected && (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                <CheckIcon className="w-4 h-4 text-white" />
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
})

SearchResultsList.displayName = 'SearchResultsList'
