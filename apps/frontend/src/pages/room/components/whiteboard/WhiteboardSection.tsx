import { useState } from 'react'
import { SilverwareForkKnifeIcon, CoffeeIcon, LiquorIcon, PlusIcon, CompassIcon, PencilIcon, CloseIcon } from '@/shared/assets'
import { Button } from '@/shared/components'
import { GoogleMap } from '@/shared/components/google-map'
import { cn } from '@/shared/utils'
import type { Category, GooglePlace, PlaceCard } from '@/shared/types'
import { AddCategoryModal } from '@/pages/room/components/add-category'
import { DeleteCategoryModal } from './delete-category'
import { WhiteboardCanvas } from './canvas'

type ToggleType = 'map' | 'canvas'

interface WhiteboardSectionProps {
  roomId: string
  onCreateCategory: (name: string) => void
  onDeleteCategory: (categoryId: string) => void
  categories: Category[]
  activeCategoryId: string
  pendingPlaceCard: Omit<PlaceCard, 'x' | 'y'> | null
  onPlaceCardPlaced: () => void
  onPlaceCardCanceled: () => void
  searchResults?: GooglePlace[]
  selectedPlace: GooglePlace | null
  onMarkerClick?: (place: GooglePlace | null) => void
  onActiveCategoryChange: (categoryId: string) => void
}

export const WhiteboardSection = ({
  roomId,
  onCreateCategory,
  onDeleteCategory,
  categories,
  activeCategoryId,
  pendingPlaceCard,
  onActiveCategoryChange,
  onPlaceCardPlaced,
  onPlaceCardCanceled,
  searchResults = [],
  selectedPlace,
  onMarkerClick,
}: WhiteboardSectionProps) => {
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<Category>()

  const [viewMode, setViewMode] = useState<ToggleType>('canvas')

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

  const toggleButtonBaseClass = 'rounded-full transition-all duration-200'
  const activeClass = 'bg-primary hover:bg-primary-pressed ring-primary text-white shadow-md'
  const inactiveClass = 'text-gray hover:bg-gray-bg hover:text-black bg-transparent'

  return (
    <section className="flex flex-col flex-1 h-full overflow-hidden">
      <header className="flex items-end pt-3 bg-slate-100 overflow-x-auto">
        <nav className="flex flex-1 items-end gap-1 border-b border-slate-300 px-4" role="tablist">
          {categories.map(category => {
            const isActive = activeCategoryId === category.id
            return (
              <div
                key={category.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => onActiveCategoryChange(category.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onActiveCategoryChange(category.id)
                  }
                }}
                tabIndex={0}
                className={cn(
                  'min-w-fit flex items-center gap-2 px-6 py-2.5 rounded-t-xl border-t border-x transition-colors cursor-pointer',
                  isActive
                    ? 'bg-slate-50 border-slate-300 relative z-10 -mb-px border-b border-b-slate-50'
                    : 'bg-slate-200 border-slate-300 hover:bg-slate-150',
                )}
              >
                {getIconByType(category.title)}
                <span className="font-bold text-gray-800 text-sm">{category.title}</span>
                {isActive && (
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
            )
          })}

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

      <main className="flex-1 bg-slate-50 overflow-hidden relative" role="tabpanel">
        {viewMode === 'canvas' ? (
          <WhiteboardCanvas
            roomId={roomId}
            canvasId={activeCategoryId}
            pendingPlaceCard={pendingPlaceCard}
            onPlaceCardPlaced={onPlaceCardPlaced}
            onPlaceCardCanceled={onPlaceCardCanceled}
          />
        ) : (
          <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
            <GoogleMap
              markers={searchResults}
              selectedMarkerId={selectedPlace?.id}
              onMarkerClick={onMarkerClick}
              center={getFirstResultCenter(searchResults)}
            />
          </div>
        )}

        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="flex p-1 bg-white rounded-full shadow-lg border border-slate-200">
            <Button
              size="sm"
              variant={viewMode === 'canvas' ? 'primary' : 'ghost'}
              onClick={() => setViewMode('canvas')}
              className={cn(toggleButtonBaseClass, viewMode === 'canvas' ? activeClass : inactiveClass)}
            >
              캔버스
            </Button>

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

function getFirstResultCenter(results: GooglePlace[]) {
  if (!results[0]) return undefined
  return { lat: results[0].location.latitude, lng: results[0].location.longitude }
}
