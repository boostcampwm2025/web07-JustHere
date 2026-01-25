import { Modal } from '@/shared/components'
import type { KakaoPlace } from '@/shared/types'

type PlaceDetailModalProps = {
  place: KakaoPlace
  onClose: () => void
}

export const PlaceDetailModal = ({ place, onClose }: PlaceDetailModalProps) => {
  const placeUrl = `https://place.map.kakao.com/${place.id}`

  return (
    <Modal title={place.place_name} onClose={onClose} className="w-lg h-[85vh] max-h-[800px]">
      <Modal.Body className="p-0 flex-1 min-h-0 flex flex-col">
        <iframe src={placeUrl} title={`${place.place_name} 상세 정보`} className="w-full h-full border-0 flex-1" allow="fullscreen" />
      </Modal.Body>
    </Modal>
  )
}
