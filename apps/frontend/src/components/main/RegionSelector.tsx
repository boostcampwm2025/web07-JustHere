import { useState, useRef, useEffect } from 'react'
import { MapMarkerIcon, ChevronDownIcon, MagnifyIcon, CloseIcon } from '@/components/Icons'
import { updateRoom } from '@/api/room'
import { useSearchKeyword } from '@/hooks/kakao/useKakaoQueries'
import { cn } from '@/utils/cn'
import type { KakaoPlace } from '@/types/kakao'

interface RegionSelectorProps {
  currentRegion?: string | null
  slug: string
  onRegionChange?: (region: { x: number; y: number; place_name: string }) => void
}

export default function RegionSelector({ slug, onRegionChange }: RegionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const { data: results, isLoading } = useSearchKeyword(searchTerm)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 드롭다운 열릴 때 input 포커스
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
      setSearchTerm('')
    } catch (error) {
      console.error('지역 변경 실패:', error)
    }
  }

  const handleClear = () => {
    setKeyword('')
    setSearchTerm('')
    inputRef.current?.focus()
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 트리거 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-4 h-9 rounded-lg font-bold text-sm transition-colors',
          'bg-gray-100 text-gray-800 hover:bg-gray-200',
        )}
      >
        <MapMarkerIcon className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-gray-700 max-w-32 truncate">지역 변경</span>
        <ChevronDownIcon className={cn('w-4 h-4 text-gray-400 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {/* 드롭다운 패널 */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border animate-slide-up z-50">
          {/* 검색바 */}
          <div className="p-3 border-b">
            <div className="relative">
              <MagnifyIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                <button onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <CloseIcon className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>

          {/* 검색 결과 */}
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-gray-500">검색 중...</div>
            ) : results && results.documents.length > 0 ? (
              <ul>
                {results.documents.map(place => (
                  <li key={place.id}>
                    <button onClick={() => handleSelect(place)} className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors">
                      <div className="text-sm font-medium text-gray-900">{place.place_name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{place.address_name}</div>
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
