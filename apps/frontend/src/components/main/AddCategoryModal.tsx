import { useState } from 'react'
import { Button } from '@/components/common/Button'
import { CloseIcon, CoffeeIcon, CompassIcon, LiquorIcon, SilverwareForkKnifeIcon } from '@/components/Icons'
import { cn } from '@/utils/cn'

const categories = [
  { name: '음식점', icon: SilverwareForkKnifeIcon },
  { name: '카페', icon: CoffeeIcon },
  { name: '술집', icon: LiquorIcon },
  { name: '가볼만한곳', icon: CompassIcon },
]

interface AddCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (category: string) => void
}

export default function AddCategoryModal({ isOpen, onClose, onComplete }: AddCategoryModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined)

  const handleCategoryClick = (categoryName: string) => {
    setSelectedCategory(categoryName)
  }

  const onSelectCategory = () => {
    if (selectedCategory && onComplete) {
      onComplete(selectedCategory)
    }

    setSelectedCategory(undefined)
    onClose()
  }

  const onClickClose = () => {
    setSelectedCategory(undefined)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-60">
      <div className="fixed inset-0 bg-gray-500/50" onClick={onClickClose} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-2xl w-full bg-white z-40 shadow-xl rounded-3xl border border-gray-100">
        <div className="flex flex-col gap-6 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold">카테고리 선택</h3>
              <span className="text-sm pb-4">어떤 종류의 장소를 찾고 계신가요?</span>
            </div>
            <Button variant="ghost" size="icon" onClick={onClickClose} className="text-gray-disable hover:bg-transparent hover:text-gray">
              <CloseIcon className="w-6 h-6" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {categories.map(category => {
              const Icon = category.icon
              const isSelected = selectedCategory === category.name
              return (
                <Button
                  key={category.name}
                  variant="ghost"
                  size="lg"
                  onClick={() => handleCategoryClick(category.name)}
                  className={cn(
                    'h-fit py-4 border rounded-xl transition-all',
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-md hover:bg-primary/20 active:bg-primary/20'
                      : 'border-gray-100 hover:border-gray-200',
                  )}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Icon className={cn('size-12 rounded-full p-2.5 transition-colors', isSelected ? 'bg-primary/20 text-primary' : 'bg-gray-100')} />
                    <span>{category.name}</span>
                  </div>
                </Button>
              )
            })}
          </div>
        </div>
        <div className="flex justify-end gap-2 bg-gray-50 p-4 rounded-b-3xl border-t border-gray-200">
          <Button variant="ghost" size="sm" className="bg-white border border-gray-200" onClick={onClickClose}>
            취소
          </Button>
          <Button variant="primary" size="sm" onClick={onSelectCategory} disabled={!selectedCategory}>
            선택 완료
          </Button>
        </div>
      </div>
    </div>
  )
}
