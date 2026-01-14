import { Button } from '@/components/common/Button'
import KakaoMap from '@/components/KakaoMap'
import WhiteboardCanvas from '@/components/main/WhiteboardCanvas.tsx'
import { cn } from '@/utils/cn.ts'
import { useState } from 'react'
import { SilverwareForkKnifeIcon, CoffeeIcon, LiquorIcon, PlusIcon } from '@/components/Icons'

// 탭의 아이콘/라벨 타입을 결정하기 위한 UI 타입
type CategoryType = 'restaurant' | 'cafe' | 'bar' | 'custom'
type ToggleType = 'map' | 'canvas'

// 실제 카테고리 데이터 구조 (DB/Y.js와 연동될 구조)
interface CategoryTab {
  id: string // UUID (socket room 접속용)
  type: CategoryType // 아이콘 타입
  label: string
}

function WhiteboardSection() {
  // 카테고리 더미 데이터
  // TODO: 실제로는 API를 통해 방(Room) 정보를 불러올 때 카테고리 리스트도 받아와야 함.
  const [categories] = useState<CategoryTab[]>([
    {
      id: 'cat-uuid-1', // 예: 실제 UUID
      type: 'restaurant',
      label: '음식점',
    },
    {
      id: 'cat-uuid-2',
      type: 'cafe',
      label: '카페',
    },
    {
      id: 'cat-uuid-3',
      type: 'bar',
      label: '술집',
    },
  ])

  // 현재 활성화된 카테고리 ID (초기값: 첫 번째 카테고리)
  const [activeCategoryId, setActiveCategoryId] = useState<string>(categories[0].id)

  const [viewMode, setViewMode] = useState<ToggleType>('canvas')

  // 아이콘 맵퍼 (Type에 따라 아이콘 반환)
  const getIconByType = (type: CategoryType) => {
    switch (type) {
      case 'restaurant':
        return <SilverwareForkKnifeIcon className="w-4 h-4" />
      case 'cafe':
        return <CoffeeIcon className="w-4 h-4" />
      case 'bar':
        return <LiquorIcon className="w-4 h-4" />
      default:
        return <SilverwareForkKnifeIcon className="w-4 h-4" />
    }
  }

  // TODO: [아진] 해당 버튼 스타일이 많이 사용되면 Button 컴포넌트를 확장한 ToggleButton을 따로 만들어도 좋을 것 같음.
  // 토글 버튼 공통 스타일
  const toggleButtonBaseClass = 'rounded-full transition-all duration-200'

  // 토글 활성화 스타일
  const activeClass = 'bg-primary hover:bg-primary-pressed ring-primary text-white shadow-md'

  // 토글 비활성화 스타일
  const inactiveClass = 'text-gray hover:bg-gray-bg hover:text-black bg-transparent'

  // TODO: URL params의 room UUID 가져오기
  const roomId = 'room1'

  return (
    <section className="flex flex-col flex-1 h-full overflow-hidden">
      {/* Tab Header */}
      <header className="flex items-end gap-1 px-4 pt-3 bg-slate-100 border-b border-gray-200">
        <nav className="flex items-end gap-1" role="tablist">
          {categories.map(category => (
            <button
              key={category.id}
              role="tab"
              // 활성화 여부를 ID로 비교
              aria-selected={activeCategoryId === category.id}
              onClick={() => setActiveCategoryId(category.id)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-t-xl border-t border-x border-slate-300 transition-colors ${
                activeCategoryId === category.id ? 'bg-slate-50 border-l' : 'bg-slate-200 hover:bg-slate-150'
              }`}
            >
              {getIconByType(category.type)}
              <span className="font-bold text-gray-800 text-sm">{category.label}</span>
            </button>
          ))}
        </nav>

        {/* Add Tab Button */}
        {/* TODO: 클릭 시 카테고리 추가 모달 오픈 -> API 호출 -> setCategories 업데이트 */}
        <button className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-200 transition-colors mb-1" aria-label="새 탭 추가">
          <PlusIcon className="w-5 h-5 text-gray-800" />
        </button>
      </header>

      {/* Whiteboard Canvas */}
      <main className="flex-1 bg-slate-50 overflow-hidden relative" role="tabpanel">
        {viewMode === 'canvas' ? (
          <WhiteboardCanvas roomId={roomId} canvasId={activeCategoryId} />
        ) : (
          <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
            <KakaoMap />
          </div>
        )}

        {/* 4. 하단 중앙 토글 버튼 (Floating UI) */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="flex p-1 bg-white rounded-full shadow-lg border border-slate-200">
            {/* Canvas Mode Button */}
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

export default WhiteboardSection
