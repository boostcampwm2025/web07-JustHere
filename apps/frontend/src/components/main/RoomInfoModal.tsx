import { CloseIcon, PencilIcon, ContentCopyIcon } from '@/components/Icons'
import { MOCK_PARTICIPANTS } from '@/mocks'
import { Button } from '@/components/common/Button'

interface RoomInfoModalProps {
  isOpen: boolean
  onClose: () => void
  userName?: string
  roomLink?: string
}

export default function RoomInfoModal({ isOpen, onClose, userName = '김아진', roomLink = 'www.justhere.p-e.kr/abxbfdff..' }: RoomInfoModalProps) {
  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-transparent" onClick={onClose} />
      <div className="absolute top-full right-0 z-50 bg-white rounded-3xl w-[340px] max-h-[600px] shadow-xl border border-gray-100 overflow-y-auto scrollbar-hide">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4.5 right-4 z-10 text-gray-disable hover:bg-transparent hover:text-gray"
        >
          <CloseIcon className="w-6 h-6" />
        </Button>

        <div className="px-6 py-6">
          <h3 className="text-xl font-bold text-black text-center mb-6">참여자</h3>
          <div className="flex flex-col gap-2">
            {MOCK_PARTICIPANTS.map(p => (
              <div key={p.id} className="flex items-center gap-4 px-2 py-1">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[18px] font-bold text-black shadow-sm"
                  style={{ backgroundColor: p.color }}
                >
                  {p.initial}
                </div>
                <span className="text-[18px] text-black">{p.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 pb-6">
          <h2 className="text-lg font-bold text-black mb-4">내 정보 수정하기</h2>

          <div className="mb-4">
            <label className="block text-sm text-gray mb-1.5">이름</label>
            <div className="relative group">
              <input
                type="text"
                defaultValue={userName}
                className="w-full h-[50px] px-4 border border-gray-200 rounded-lg text-gray text-base focus:outline-none focus:border-primary transition-colors"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 p-0 text-gray-disable hover:bg-transparent group-focus-within:text-primary"
              >
                <PencilIcon className="w-[18px] h-[18px]" />
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray mb-2">방 초대 링크</label>
            <div className="flex flex-col gap-3">
              <div className="bg-gray-bg border border-gray-200 rounded-lg px-4 py-3 h-[46px] flex items-center overflow-hidden">
                <span className="text-[18px] text-black truncate w-full">{roomLink}</span>
              </div>
              <Button
                variant="primary"
                size="lg"
                className="h-11 rounded-lg shadow-sm font-normal active:scale-[0.98]"
                icon={<ContentCopyIcon className="w-[18px] h-[18px]" />}
              >
                링크 복사
              </Button>
            </div>
          </div>
        </div>

        <div className="h-2 bg-gray-bg border-t border-b border-gray-200" />
      </div>
    </>
  )
}
