import { useState, useEffect } from 'react'
import { Button } from '@/components/common/Button'
import { KakaoMap } from '@/components/KakaoMap'
import { WhiteboardCanvas } from '@/components/main/WhiteboardCanvas'
import { SilverwareForkKnifeIcon, CoffeeIcon, LiquorIcon, PlusIcon, CompassIcon, PencilIcon, CloseIcon } from '@/components/Icons'
import { cn } from '@/utils/cn.ts'
import { useRoomCategories } from '@/hooks/room'
import type { Category } from '@/types/domain'
import { AddCategoryModal } from './AddCategoryModal'
import { DeleteCategoryModal } from './DeleteCategoryModal'
import type { KakaoPlace } from '@/types/kakao'
import type { PlaceCard } from '@/types/canvas.types'

// 탭의 아이콘/라벨 타입을 결정하기 위한 UI 타입
type ToggleType = 'map' | 'canvas'

interface WhiteboardSectionProps {
  roomId: string
  onCreateCategory: (name: string) => void
  onDeleteCategory: (categoryId: string) => void
  pendingPlaceCard: Omit<PlaceCard, 'x' | 'y'> | null
  onPlaceCardPlaced: () => void
  onPlaceCardCanceled: () => void
  searchResults?: KakaoPlace[]
  selectedPlace: KakaoPlace | null
  onMarkerClick?: (place: KakaoPlace | null) => void
}

function WhiteboardSection({
  roomId,
  onCreateCategory,
  onDeleteCategory,
  pendingPlaceCard,
  onPlaceCardPlaced,
  onPlaceCardCanceled,
  searchResults = [],
  selectedPlace,
  onMarkerClick,
}: WhiteboardSectionProps) {
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<Category>()
  const { data: categories } = useRoomCategories(roomId)

  const [activeCategoryId, setActiveCategoryId] = useState<string>('')
  const [viewMode, setViewMode] = useState<ToggleType>('canvas')

  useEffect(() => {
    setActiveCategoryId(resolveActiveCategoryId(categories, activeCategoryId))
  }, [categories, activeCategoryId])

  // TODO: src/utils 경로에 배치해서 별도 분리
  // 아이콘 맵퍼 (Type에 따라 아이콘 반환)
  const getIconByType = (type: string) => {
    switch (type) {
      case '음식점':
        return <SilverwareForkKnifeIcon className="w-4 h-4" />
      case '카페':
        return <CoffeeIcon className="w-4 h-4" />
      case '술집':
        return <LiquorIcon className="w-4 h-4" />
      case '가볼만한곳':
        return <CompassIcon className="w-4 h-4" />
      default:
        return <PencilIcon className="w-4 h-4" />
    }
  }

  // TODO: [아진] 해당 버튼 스타일이 많이 사용되면 Button 컴포넌트를 확장한 ToggleButton을 따로 만들어도 좋을 것 같음.
  // 토글 버튼 공통 스타일
  const toggleButtonBaseClass = 'rounded-full transition-all duration-200'

  // 토글 활성화 스타일
  const activeClass = 'bg-primary hover:bg-primary-pressed ring-primary text-white shadow-md'

  // 토글 비활성화 스타일
  const inactiveClass = 'text-gray hover:bg-gray-bg hover:text-black bg-transparent'

  // TODO: 자식 컴포넌트가 너무 많으니까 Compound Pattern으로 관리해도? 괜찮을 듯 합니다.
  return (
    <section className="flex flex-col flex-1 h-full overflow-hidden">
      {/* Tab Header */}
      <header className="flex items-end px-4 pt-3 bg-slate-100 border-b border-gray-200 overflow-x-auto">
        <nav className="flex items-end gap-1" role="tablist">
          {categories.map(category => (
            <div
              key={category.id}
              role="tab"
              // 활성화 여부를 ID로 비교
              aria-selected={activeCategoryId === category.id}
              onClick={() => setActiveCategoryId(category.id)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setActiveCategoryId(category.id)
                }
              }}
              tabIndex={0}
              className={cn(
                'min-w-fit flex items-center gap-2 px-6 py-2.5 rounded-t-xl border-t border-x border-slate-300 transition-colors',
                activeCategoryId === category.id ? 'bg-slate-50 border-l' : 'bg-slate-200 hover:bg-slate-150',
              )}
            >
              {getIconByType(category.title)}
              <span className="font-bold text-gray-800 text-sm">{category.title}</span>
              {activeCategoryId === category.id && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="카테고리 삭제"
                  className="text-gray-disable hover:text-gray rounded-full p-0"
                  onClick={e => {
                    e.stopPropagation()
                    setCategoryToDelete(category)
                  }}
                >
                  <CloseIcon className="size-4" />
                </Button>
              )}
            </div>
          ))}

          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-slate-200 transition-colors mb-1 ml-1 shrink-0"
            aria-label="새 탭 추가"
            onClick={() => setIsAddCategoryModalOpen(true)}
          >
            <PlusIcon className="size-5 text-gray-800" />
          </Button>
        </nav>

        {isAddCategoryModalOpen && <AddCategoryModal onClose={() => setIsAddCategoryModalOpen(false)} onComplete={onCreateCategory} />}
        {categoryToDelete && (
          <DeleteCategoryModal
            categoryName={categoryToDelete.title}
            onClose={() => setCategoryToDelete(undefined)}
            onConfirm={() => onDeleteCategory(categoryToDelete.id)}
          />
        )}
      </header>

      {/* Whiteboard Canvas */}
      <main className="flex-1 bg-slate-50 overflow-hidden relative" role="tabpanel">
        {viewMode === 'canvas' ? (
          activeCategoryId ? (
            <WhiteboardCanvas
              roomId={roomId}
              canvasId={activeCategoryId}
              pendingPlaceCard={pendingPlaceCard}
              onPlaceCardPlaced={onPlaceCardPlaced}
              onPlaceCardCanceled={onPlaceCardCanceled}
            />
          ) : (
            <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <p className="text-lg font-semibold mb-2">카테고리가 없습니다</p>
                <p className="text-sm">새 카테고리를 추가해주세요</p>
              </div>
            </div>
          )
        ) : (
          <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
            <KakaoMap
              markers={searchResults}
              selectedMarkerId={selectedPlace?.id}
              onMarkerClick={onMarkerClick}
              center={searchResults[0] ? { lat: Number(searchResults[0].y), lng: Number(searchResults[0].x) } : undefined}
            />
          </div>
        )}

        {/* 4. 하단 중앙 토글 버튼 (Floating UI) */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="flex p-1 bg-white rounded-full shadow-lg border border-slate-200">
            {/* Canvas Mode Button */}
            {/* TODO: 이것도 toggle.map(() => {} ) 이런 식으로 변경 가능할 듯 */}
            <Button
              size="sm"
              variant={viewMode === 'canvas' ? 'primary' : 'ghost'}
              onClick={() => setViewMode('canvas')}
              className={cn(toggleButtonBaseClass, viewMode === 'canvas' ? activeClass : inactiveClass)}
            >
              캔버스
            </Button>

            {/* Map Mode Button */}
            <Button
              size="sm"
              variant={viewMode === 'map' ? 'primary' : 'ghost'}
              onClick={() => setViewMode('map')}
              className={cn(toggleButtonBaseClass, viewMode === 'map' ? activeClass : inactiveClass)}
            >
              지도
            </Button>
          </div>
        </div>
      </main>
    </section>
  )
}

export { WhiteboardSection }

function resolveActiveCategoryId(categories: Category[], currentId: string) {
  if (!categories || categories.length === 0) return ''

  const exists = categories.some(c => c.id === currentId)
  return exists ? currentId : categories[0].id
}
