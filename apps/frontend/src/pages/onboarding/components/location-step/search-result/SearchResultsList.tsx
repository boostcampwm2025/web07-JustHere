import { forwardRef } from 'react'
import { CheckIcon } from '@/shared/assets'
import { Button } from '@/shared/components'
import { cn } from '@/shared/utils'
import type { GooglePlace } from '@/shared/types'

interface SearchResultsListProps {
  results: GooglePlace[]
  selectedPlace: GooglePlace | null
  onSelect: (place: GooglePlace) => void
}

export const SearchResultsList = forwardRef<HTMLDivElement, SearchResultsListProps>(({ results, selectedPlace, onSelect }, ref) => {
  return (
    <div ref={ref} className="flex flex-col gap-3 mb-6 max-h-[300px] overflow-y-auto custom-scrollbar">
      {results.map(result => {
        const isSelected = selectedPlace?.id === result.id
        return (
          <Button
            key={result.id}
            variant="outline"
            size="lg"
            onClick={() => onSelect(result)}
            className={cn(
              'rounded-xl py-4 h-fit px-5 flex items-center justify-between text-left hover:bg-transparent',
              isSelected ? 'bg-primary-bg border-primary' : 'bg-white border-gray-300 hover:border-gray',
            )}
          >
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-black">{result.displayName.text}</span>
              <span className="text-xs text-gray">{result.formattedAddress}</span>
            </div>
            {isSelected && (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                <CheckIcon className="w-4 h-4 text-white" />
              </div>
            )}
          </Button>
        )
      })}
    </div>
  )
})

SearchResultsList.displayName = 'SearchResultsList'
