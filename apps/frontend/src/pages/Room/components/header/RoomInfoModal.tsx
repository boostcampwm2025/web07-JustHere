import { useEffect, useRef } from 'react'
import { Button, PencilIcon, ContentCopyIcon, Divider } from '@/shared/ui'
import type { Participant } from '@/shared/types'
import { getParticipantColor, getParticipantInitial, cn } from '@/shared/utils'
import { Modal } from '@/shared/components'

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

export const RoomInfoModal = ({
  onClose,
  userName,
  roomLink,
  participants,
  currentUserId,
  onUpdateName,
  isOwner = false,
  ownerId,
  onTransferOwner,
}: RoomInfoModalProps) => {
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
      <div className="absolute top-full right-0 z-50 w-xs">
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            'bg-white shadow-xl border border-gray-100 rounded-3xl overflow-hidden flex flex-col',
            'max-h-[600px] overflow-y-auto scrollbar-hide',
          )}
        >
          <Modal.Body>
            <h3 className="text-xl font-bold text-center my-6">참여자</h3>
            <div className="flex flex-col gap-2">
              {visibleParticipants.map(p => (
                <div key={p.userId} className="flex items-center gap-2 px-2 py-1">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-sm',
                      getParticipantColor(p.name),
                    )}
                  >
                    {getParticipantInitial(p.name)}
                  </div>

                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-lg text-black truncate">{p.name}</span>
                    {ownerId && p.userId === ownerId && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 shrink-0">방장</span>
                    )}
                    {p.userId === currentUserId && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 shrink-0">나</span>}
                  </div>

                  {isOwner && p.userId !== currentUserId && (
                    <Button variant="outline" size="sm" onClick={() => onTransferOwner?.(p.userId)}>
                      방장 넘기기
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Divider className="my-4" />

            <div className="gap-4 flex flex-col">
              <div>
                <label className="block text-sm text-gray mb-1.5">이름 수정</label>
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
                    className="w-full h-12 px-4 border border-gray-200 rounded-lg text-gray text-base focus:outline-none focus:border-primary transition-colors"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSubmit}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-0  hover:bg-transparent group-focus-within:text-primary"
                    aria-label="이름 수정"
                  >
                    <PencilIcon className="size-4.5" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray mb-2">방 초대 링크</label>
                <div className="flex flex-col gap-3">
                  <div className="bg-gray-bg border border-gray-200 rounded-lg px-4 py-3 h-12 flex items-center overflow-hidden">
                    <span className="text-black truncate w-full">{roomLink}</span>
                  </div>
                  <Button variant="primary" size="lg" className="h-11" icon={<ContentCopyIcon className="size-4" />} onClick={handleCopyLink}>
                    링크 복사
                  </Button>
                </div>
              </div>
            </div>
          </Modal.Body>
        </div>
      </div>
    </>
  )
}
