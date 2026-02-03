import { useState } from 'react'
import { useGoogleSearch, useUpdateRoom } from '@/shared/hooks'
import { MapMarkerIcon, ChevronDownIcon } from '@/shared/assets'
import { Button, Divider, Dropdown, SearchInput } from '@/shared/components'
import { cn } from '@/shared/utils'
import type { GooglePlace } from '@/shared/types'

interface RegionSelectorDropdown {
  currentRegion?: string | null
  slug: string
  onRegionChange?: (region: { x: number; y: number; place_name: string }) => void
}

export const RegionSelectorDropdown = ({ slug, onRegionChange }: RegionSelectorDropdown) => {
  const [isOpen, setIsOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const { data: results, isLoading } = useGoogleSearch({ textQuery: searchTerm })

  const { mutate: updateRoom } = useUpdateRoom(slug)

  const handleSearch = () => {
    if (!keyword.trim()) return
    setSearchTerm(keyword.trim())
  }

  const handleSelect = async (place: GooglePlace) => {
    updateRoom(
      {
        x: place.location.longitude,
        y: place.location.latitude,
        place_name: place.displayName.text,
      },
      {
        onSuccess: room => {
          onRegionChange?.({
            x: room.x,
            y: room.y,
            place_name: room.place_name || '',
          })
          setIsOpen(false)
          setKeyword('')
          setSearchTerm('')
        },
        onError: error => {
          console.error('지역 변경 실패:', error)
        },
      },
    )
  }

  const handleClear = () => {
    setKeyword('')
    setSearchTerm('')
  }

  const places = results?.places ?? []

  return (
    <div className="relative">
      <Button variant="gray" className="px-3 w-full" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-1 w-full justify-center">
          <MapMarkerIcon className="size-4 text-primary shrink-0" />
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">지역 변경</span>
          <ChevronDownIcon className={cn('size-4 text-gray-400 transition-transform shrink-0', isOpen && 'rotate-180')} />
        </div>
      </Button>
      {isOpen && (
        <Dropdown onOpenChange={setIsOpen} align="right" className="w-72">
          <div className="p-3">
            <SearchInput
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onClear={handleClear}
              onSearch={handleSearch}
              placeholder="지역 검색..."
              className="h-10 text-sm border-gray-200 rounded-lg"
            />
          </div>

          <Divider />

          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-gray-500">검색 중...</div>
            ) : places.length > 0 ? (
              <ul>
                {places.map((place: GooglePlace) => (
                  <li key={place.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(place)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors hover:cursor-pointer"
                    >
                      <div className="text-sm font-medium text-gray-900">{place.displayName.text}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{place.formattedAddress}</div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : searchTerm ? (
              <div className="p-4 text-center text-sm text-gray-500">검색 결과가 없습니다</div>
            ) : (
              <div className="p-4 text-center text-sm text-gray-500">지역명을 입력하고 Enter를 눌러주세요</div>
            )}
          </div>
        </Dropdown>
      )}
    </div>
  )
}
