import { useState, useRef, useEffect } from 'react'
import { useGoogleSearch, useUpdateRoom } from '@/shared/hooks'
import { MapMarkerIcon, ChevronDownIcon, MagnifyIcon, CloseIcon } from '@/shared/assets'
import { Button } from '@/shared/components'
import { cn } from '@/shared/utils'
import type { GooglePlace } from '@/shared/types'

interface RegionSelectorProps {
  currentRegion?: string | null
  slug: string
  onRegionChange?: (region: { x: number; y: number; place_name: string }) => void
}

export const RegionSelector = ({ slug, onRegionChange }: RegionSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const { data: results, isLoading } = useGoogleSearch({ textQuery: searchTerm })

  const { mutate: updateRoom } = useUpdateRoom(slug)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || !keyword.trim()) return
    e.preventDefault()
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
    inputRef.current?.focus()
  }

  const places = results?.places ?? []

  return (
    <div className="relative" ref={dropdownRef}>
      <Button onClick={() => setIsOpen(!isOpen)} variant="gray" className="px-3 w-full">
        <div className="flex items-center gap-1 w-full justify-center">
          <MapMarkerIcon className="size-4 text-primary shrink-0" />
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">지역 변경</span>
          <ChevronDownIcon className={cn('size-4 text-gray-400 transition-transform shrink-0', isOpen && 'rotate-180')} />
        </div>
      </Button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border animate-slide-up z-50">
          <div className="p-3 border-b">
            <div className="relative">
              <MagnifyIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                onKeyDown={handleSearch}
                placeholder="지역 검색..."
                className="w-full pl-9 pr-9 py-2 text-sm border rounded-lg focus:outline-none focus:border-primary"
              />
              {keyword && (
                <Button
                  icon={<CloseIcon className="size-4" />}
                  size="icon"
                  variant="ghost"
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                />
              )}
            </div>
          </div>

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
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
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
        </div>
      )}
    </div>
  )
}
