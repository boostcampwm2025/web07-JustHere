import { useEffect, useRef } from 'react'
import { CloseIcon, PencilIcon, ContentCopyIcon } from '@/components/Icons'
import { Button } from '@/components/common/Button'
import type { Participant } from '@/types/domain'
import { getParticipantColor, getParticipantInitial } from '@/utils/participant'
import { cn } from '@/utils/cn'

interface RoomInfoModalProps {
  onClose: () => void
  userName: string
  roomLink: string
  participants: Participant[]
  currentUserId: string
  onUpdateName?: (name: string) => void
  isOwner?: boolean
  ownerId?: string
  onTransferOwner?: (targetUserId: string) => void
}

// TODO: AddCategoryModal, DeleteCategoryModal, PlaceDetailModal, RoomInfoModal 등 여러 모달이 존재
// TODO: 전부 같은 layer로 구현되어있음 -> 공통 Modal 컴포넌트로 추출해서 분리하면 좋을 듯?
export default function RoomInfoModal({
  onClose,
  userName,
  roomLink,
  participants,
  currentUserId,
  onUpdateName,
  isOwner = false,
  ownerId,
  onTransferOwner,
}: RoomInfoModalProps) {
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  // userId 기준으로 중복 제거 (같은 userId가 여러 개 있으면 첫 번째만 유지)
  const uniqueParticipants = participants.filter((p, index, self) => self.findIndex(x => x.userId === p.userId) === index)
  const hasCurrentUser = uniqueParticipants.some(p => p.userId === currentUserId)
  const visibleParticipants = hasCurrentUser ? uniqueParticipants : [{ socketId: '', userId: currentUserId, name: userName }, ...uniqueParticipants]
  useEffect(() => {
    if (!nameInputRef.current) return

    nameInputRef.current.value = userName
  }, [userName])

  const handleSubmit = () => {
    const nextName = (nameInputRef.current?.value ?? '').trim()
    if (!nextName || nextName === userName) return
    onUpdateName?.(nextName)
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(roomLink)
    } catch (error) {
      console.error('링크 복사에 실패했습니다.', error)
    }
  }

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
            {visibleParticipants.map(p => (
              <div key={p.userId} className="flex items-center gap-4 px-2 py-1">
                {/* TODO: Header & RoomInfoModal 에서 사용자 프로필 표시 로직이 중복됨 -> Avatar 컴포넌트로 분리 필요 */}
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-[18px] font-bold text-white shadow-sm',
                    getParticipantColor(p.name),
                  )}
                >
                  {getParticipantInitial(p.name)}
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-[18px] text-black">{p.name}</span>
                  {ownerId && p.userId === ownerId && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">방장</span>
                  )}
                  {p.userId === currentUserId && <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">나</span>}
                </div>
                {isOwner && p.userId !== currentUserId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs border border-gray-200 text-gray-700 hover:bg-gray-100"
                    onClick={() => onTransferOwner?.(p.userId)}
                  >
                    방장 넘기기
                  </Button>
                )}
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
                ref={nameInputRef}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleSubmit()
                  }
                }}
                className="w-full h-[50px] px-4 border border-gray-200 rounded-lg text-gray text-base focus:outline-none focus:border-primary transition-colors"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSubmit}
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
                onClick={handleCopyLink}
              >
                링크 복사
              </Button>
            </div>
          </div>
        </div>

        {/* TODO: Divider 컴포넌트로 분리 가능할 듯 */}
        <div className="h-2 bg-gray-bg border-t border-b border-gray-200" />
      </div>
    </>
  )
}
