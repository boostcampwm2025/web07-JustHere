import { Button } from '@/shared/ui/Button'
import { CloseIcon } from '@/components/Icons'

interface DeleteCategoryModalProps {
  categoryName: string
  onClose: () => void
  onConfirm: () => void
}

// TODO: AddCategoryModal, DeleteCategoryModal, PlaceDetailModal, RoomInfoModal 등 여러 모달이 존재
// TODO: 전부 같은 layer로 구현되어있음 -> 공통 Modal 컴포넌트로 추출해서 분리하면 좋을 듯?
export const DeleteCategoryModal = ({ categoryName, onClose, onConfirm }: DeleteCategoryModalProps) => {
  const onClickDelete = () => {
    onConfirm()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-60">
      <div className="fixed inset-0 bg-gray-500/50" onClick={onClose} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-md w-full bg-white z-40 shadow-xl rounded-3xl border border-gray-100">
        <div className="flex flex-col gap-4 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold">카테고리 삭제</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-disable hover:bg-transparent hover:text-gray">
              <CloseIcon className="w-6 h-6" />
            </Button>
          </div>
          <p className="text-gray-700">
            <span className="font-semibold text-black">{categoryName}</span> 카테고리를 삭제하시겠습니까?
            <br />
            <span className="text-sm text-gray-500">삭제된 카테고리의 캔버스는 복구할 수 없습니다.</span>
          </p>
        </div>
        <div className="flex justify-end gap-2 bg-gray-50 p-4 rounded-b-3xl border-t border-gray-200">
          <Button variant="ghost" size="sm" className="bg-white border border-gray-200" onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" size="sm" className="bg-red-500 hover:bg-red-600" onClick={onClickDelete}>
            삭제
          </Button>
        </div>
      </div>
    </div>
  )
}
