import { CloseIcon } from '@/components/Icons'
import { Button } from '@/components/common/Button'
import type { KakaoPlace } from '@/types/kakao'

type PlaceDetailModalProps = {
  place: KakaoPlace | null
  isOpen: boolean
  onClose: () => void
}

export default function PlaceDetailModal({ place, isOpen, onClose }: PlaceDetailModalProps) {
  if (!place || !isOpen) return null

  const placeUrl = `https://place.map.kakao.com/${place.id}`

  return (
    <div className="fixed inset-0 z-60">
      {/* 배경 오버레이 */}
      <div className="fixed inset-0 bg-gray-500/50" onClick={onClose} />

      {/* 모달 컨테이너 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[85vh] max-h-[800px] bg-white z-40 shadow-xl rounded-3xl border border-gray-100 flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100 shrink-0">
          <h3 className="text-lg font-bold text-gray-800 truncate pr-4">{place.place_name}</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-disable hover:bg-transparent hover:text-gray shrink-0"
            aria-label="모달 닫기"
          >
            <CloseIcon className="w-6 h-6" />
          </Button>
        </div>

        {/* iframe */}
        <div className="flex-1 w-full">
          <iframe src={placeUrl} title={`${place.place_name} 상세 정보`} className="w-full h-full border-0" allow="fullscreen" />
        </div>
      </div>
    </div>
  )
}
