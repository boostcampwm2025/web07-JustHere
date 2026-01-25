import { Modal } from '@/shared/components'
import { Button } from '@/shared/ui'

interface DeleteCategoryModalProps {
  categoryName: string
  onClose: () => void
  onConfirm: () => void
}

export const DeleteCategoryModal = ({ categoryName, onClose, onConfirm }: DeleteCategoryModalProps) => {
  const onClickDelete = () => {
    onConfirm()
    onClose()
  }

  return (
    <Modal title="카테고리 삭제" onClose={onClose} className="max-w-md">
      <Modal.Body>
        <p className="pb-4">
          <span className="font-semibold text-black">{categoryName}</span> 카테고리를 삭제하시겠습니까?
          <br />
          <span className="text-sm text-gray-500">삭제된 카테고리의 캔버스는 복구할 수 없습니다.</span>
        </p>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="ghost" size="sm" className="bg-white border border-gray-200" onClick={onClose}>
          취소
        </Button>
        <Button variant="primary" size="sm" onClick={onClickDelete}>
          삭제
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
