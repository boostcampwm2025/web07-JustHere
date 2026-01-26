import { useState, useRef, useEffect } from 'react'
import { MapMarkerIcon, ChevronDownIcon, MagnifyIcon, CloseIcon, Button } from '@/shared/ui'
import { searchKeyword } from '@/shared/api/kakao'
import { updateRoom } from '@/shared/api/room'
import { cn } from '@/shared/utils'
import type { KakaoPlace } from '@/shared/types'

interface RegionSelectorProps {
  currentRegion?: string | null
  slug: string
  onRegionChange?: (region: { x: number; y: number; place_name: string }) => void
}

export const RegionSelector = ({ slug, onRegionChange }: RegionSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<KakaoPlace[]>([])
  const [isLoading, setIsLoading] = useState(false)
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

  const handleSearch = async (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || !keyword.trim()) return

    setIsLoading(true)
    try {
      const { documents } = await searchKeyword({ keyword: keyword.trim() })
      setResults(documents)
    } catch (error) {
      console.error('지역 검색 실패:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = async (place: KakaoPlace) => {
    try {
      const payload = {
        x: parseFloat(place.x),
        y: parseFloat(place.y),
        place_name: place.place_name,
      }
      await updateRoom(slug, payload)
      onRegionChange?.(payload)
      setIsOpen(false)
      setKeyword('')
      setResults([])
    } catch (error) {
      console.error('지역 변경 실패:', error)
    }
  }

  const handleClear = () => {
    setKeyword('')
    setResults([])
    inputRef.current?.focus()
  }

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
            ) : results.length > 0 ? (
              <ul>
                {results.map(place => (
                  <li key={place.id}>
                    <button onClick={() => handleSelect(place)} className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors">
                      <div className="text-sm font-medium text-gray-900">{place.place_name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{place.address_name}</div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : keyword ? (
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
