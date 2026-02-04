import { useEffect, useRef, useState } from 'react'
import { PencilIcon, ContentCopyIcon, ShareVariantIcon, CheckIcon } from '@/shared/assets'
import { Button, Divider, Avatar, Dropdown } from '@/shared/components'
import type { Participant } from '@/shared/types'
import { useToast } from '@/shared/hooks'
import { reportError, resolveErrorMessage } from '@/shared/utils'

interface RoomInfoDropdownProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userName: string
  roomLink: string
  participants: Participant[]
  currentUserId: string
  onUpdateName?: (name: string) => void
  isOwner?: boolean
  ownerId?: string
  onTransferOwner?: (targetUserId: string) => void
}

export const RoomInfoDropdown = ({
  open,
  onOpenChange,
  userName,
  roomLink,
  participants,
  currentUserId,
  onUpdateName,
  isOwner = false,
  ownerId,
  onTransferOwner,
}: RoomInfoDropdownProps) => {
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const [copied, setCopied] = useState(false)
  const { showToast } = useToast()

  const hasCurrentUser = participants.some(p => p.userId === currentUserId)
  const visibleParticipants = hasCurrentUser ? participants : [{ socketId: '', userId: currentUserId, name: userName }, ...participants]
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
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      reportError({ error, code: 'CLIENT_CLIPBOARD_WRITE_FAILED', context: { roomLink } })
      showToast(resolveErrorMessage(error, 'CLIENT_CLIPBOARD_WRITE_FAILED'), 'error')
    }
  }

  return (
    <div className="relative">
      <Button size="sm" icon={<ShareVariantIcon className="size-4.5" />} onClick={() => onOpenChange(!open)}>
        공유하기
      </Button>
      {open && (
        <Dropdown onOpenChange={onOpenChange} align="right" className="w-xs max-h-[600px] overflow-y-auto scrollbar-hide p-0">
          <div className="p-6">
            <h3 className="text-lg font-bold text-center mb-6">참여자</h3>
            <div className="flex flex-col gap-2">
              {visibleParticipants.map(p => (
                <div key={p.userId} className="flex items-center gap-3 px-2 py-1">
                  <Avatar name={p.name} />

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
                  <Button
                    variant="primary"
                    size="lg"
                    className="h-11"
                    icon={copied ? <CheckIcon className="size-4 text-white" /> : <ContentCopyIcon className="size-4 text-white" />}
                    onClick={handleCopyLink}
                  >
                    링크 복사
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Dropdown>
      )}
    </div>
  )
}
