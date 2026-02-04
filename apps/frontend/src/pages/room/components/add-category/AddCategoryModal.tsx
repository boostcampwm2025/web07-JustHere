import { useMemo, useState } from 'react'
import { Button, Modal } from '@/shared/components'
import { cn } from '@/shared/utils'
import type { CategoryName } from '@/pages/room/types'
import { MAX_CUSTOM_LEN, CATEGORIES } from '@/pages/room/constants'

interface AddCategoryModalProps {
  onComplete: (category: string) => void
  onClose?: () => void
  closeable?: boolean
}

export const AddCategoryModal = ({ onClose, onComplete, closeable = true }: AddCategoryModalProps) => {
  const [selected, setSelected] = useState<CategoryName | undefined>(undefined)
  const [custom, setCustom] = useState('')

  const isCustomSelected = selected === '직접 입력'
  const trimmedCustom = custom.trim()

  const submitValue = useMemo(() => {
    if (!selected) return ''
    if (isCustomSelected) return trimmedCustom
    return selected
  }, [isCustomSelected, selected, trimmedCustom])

  const isSubmitDisabled = useMemo(() => {
    if (!selected) return true
    if (!isCustomSelected) return false
    return trimmedCustom.length === 0 || trimmedCustom.length > MAX_CUSTOM_LEN
  }, [isCustomSelected, selected, trimmedCustom.length])

  const resetState = () => {
    setSelected(undefined)
    setCustom('')
  }

  const handleClose = () => {
    resetState()
    onClose?.()
  }

  const handlePickCategory = (name: CategoryName) => {
    setSelected(name)
    if (name !== '직접 입력') setCustom('')
  }

  const handleSubmit = () => {
    if (!submitValue) return
    onComplete(submitValue)
    handleClose()
  }

  return (
    <Modal title="카테고리 추가" onClose={handleClose} closeable={closeable}>
      <Modal.Body className="pt-0">
        <div className="flex flex-col gap-6">
          <span className="text-sm text-gray-700">어떤 종류의 장소를 찾고 계신가요?</span>

          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(({ name, icon: Icon }) => {
              return (
                <Button
                  key={name}
                  variant="ghost"
                  size="lg"
                  onClick={() => handlePickCategory(name)}
                  className={cn(
                    'h-fit py-4 border rounded-xl transition-all',
                    selected === name
                      ? 'border-primary bg-primary/10 shadow-md hover:bg-primary/20 active:bg-primary/20'
                      : 'border-gray-100 hover:border-gray-200',
                  )}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Icon
                      className={cn('size-12 rounded-full p-2.5 transition-colors', selected === name ? 'bg-primary/20 text-primary' : 'bg-gray-100')}
                    />
                    <span>{name}</span>
                  </div>
                </Button>
              )
            })}
          </div>

          {isCustomSelected && (
            <div className="flex flex-col gap-2">
              <label htmlFor="custom-category" className="text-sm font-medium text-gray-700">
                카테고리 이름
              </label>
              <input
                id="custom-category"
                value={custom}
                onChange={e => setCustom(e.target.value)}
                placeholder="카테고리 이름을 입력하세요"
                maxLength={MAX_CUSTOM_LEN}
                className={cn(
                  'w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                  trimmedCustom.length > MAX_CUSTOM_LEN ? 'border-red-300 focus:ring-red-500' : 'border-gray-200',
                )}
                autoFocus
              />
              {trimmedCustom.length > MAX_CUSTOM_LEN && <span className="text-xs text-red-500">15자 이하로 입력해주세요</span>}
            </div>
          )}
        </div>
      </Modal.Body>

      <Modal.Footer>
        {closeable && (
          <Button variant="outline" size="sm" onClick={handleClose} className="bg-white">
            취소
          </Button>
        )}
        <Button variant="primary" size="sm" onClick={handleSubmit} disabled={isSubmitDisabled}>
          선택 완료
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
