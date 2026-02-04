import type { ReactNode } from 'react'
import { useState } from 'react'
import { useGoogleSearch, useUpdateRoom, useToast } from '@/shared/hooks'
import { ChevronDownIcon } from '@/shared/assets'
import { Divider, Dropdown, SearchInput } from '@/shared/components'
import { cn, getErrorCode, reportError, resolveErrorMessage } from '@/shared/utils'
import type { GooglePlace } from '@/shared/types'
import { useQueryClient } from '@tanstack/react-query'

interface RegionSelectorDropdownProps {
  slug: string
  onRegionChange?: (region: { x: number; y: number; place_name: string }) => void
  trigger?: (props: { isOpen: boolean; toggle: () => void }) => ReactNode
  align?: 'left' | 'right'
}

export const RegionSelectorDropdown = ({ slug, onRegionChange, trigger, align = 'right' }: RegionSelectorDropdownProps) => {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const { data: results, isLoading } = useGoogleSearch({ textQuery: searchTerm })
  const { showToast } = useToast()

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
          const code = getErrorCode(error, 'CLIENT_ROOM_UPDATE_FAILED')
          reportError({ error, code, context: { action: 'update_room_region', placeId: place.id } })
          showToast(resolveErrorMessage(error, code), 'error')
        },
      },
    )
    queryClient.invalidateQueries({
      queryKey: ['google', 'search'],
      exact: false,
      refetchType: 'none',
    })
  }

  const handleClear = () => {
    setKeyword('')
    setSearchTerm('')
  }

  const toggle = () => setIsOpen(prev => !prev)
  const places = results?.places ?? []

  const defaultTrigger = (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
    >
      <span className="text-sm font-medium whitespace-nowrap">지역 변경</span>
      <ChevronDownIcon className={cn('size-4 text-gray-400 transition-transform', isOpen && 'rotate-180')} />
    </button>
  )

  return (
    <div className="relative">
      {trigger ? trigger({ isOpen, toggle }) : defaultTrigger}
      {isOpen && (
        <Dropdown onOpenChange={setIsOpen} align={align} className="w-72">
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
