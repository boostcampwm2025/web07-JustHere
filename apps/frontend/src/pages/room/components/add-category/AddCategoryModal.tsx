import { useState, type ElementType } from 'react'
import { CoffeeIcon, CompassIcon, LiquorIcon, PencilIcon, SilverwareForkKnifeIcon } from '@/shared/assets'
import { Button, Modal } from '@/shared/components'
import { cn } from '@/shared/utils'

type Category = {
  name: '음식점' | '카페' | '술집' | '가볼만한곳' | '직접 입력'
  icon: ElementType
}

const categories: Category[] = [
  { name: '음식점', icon: SilverwareForkKnifeIcon },
  { name: '카페', icon: CoffeeIcon },
  { name: '술집', icon: LiquorIcon },
  { name: '가볼만한곳', icon: CompassIcon },
  { name: '직접 입력', icon: PencilIcon },
]

interface AddCategoryModalProps {
  onComplete: (category: string) => void
  onClose?: () => void
  closeable?: boolean
}

export const AddCategoryModal = ({ onClose, onComplete, closeable = true }: AddCategoryModalProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined)
  const [customCategory, setCustomCategory] = useState('')

  const handleCategoryClick = (categoryName: Category['name']) => {
    setSelectedCategory(categoryName)
    setCustomCategory('')
  }

  const onSelectCategory = () => {
    const categoryToSubmit = selectedCategory === '직접 입력' ? customCategory.trim() : selectedCategory
    if (categoryToSubmit) onComplete(categoryToSubmit)
    onClickClose()
  }

  const onClickClose = () => {
    setSelectedCategory(undefined)
    setCustomCategory('')
    onClose?.()
  }

  const isSubmitDisabled = selectedCategory === '직접 입력' ? !customCategory.trim() : !selectedCategory

  return (
    <Modal title="카테고리 추가" onClose={onClickClose} closeable={closeable}>
      <Modal.Body className="pt-0">
        <div className="flex flex-col gap-6">
          <span className="text-sm text-gray-700">어떤 종류의 장소를 찾고 계신가요?</span>

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

          {selectedCategory === '직접 입력' && (
            <div className="flex flex-col gap-2">
              <label htmlFor="custom-category" className="text-sm font-medium text-gray-700">
                카테고리 이름
              </label>
              <input
                id="custom-category"
                value={customCategory}
                onChange={e => setCustomCategory(e.target.value)}
                placeholder="카테고리 이름을 입력하세요"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                autoFocus
              />
            </div>
          )}
        </div>
      </Modal.Body>

      <Modal.Footer>
        {closeable && (
          <Button variant="outline" size="sm" onClick={onClickClose} className="bg-white">
            취소
          </Button>
        )}
        <Button variant="primary" size="sm" onClick={onSelectCategory} disabled={isSubmitDisabled}>
          선택 완료
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
