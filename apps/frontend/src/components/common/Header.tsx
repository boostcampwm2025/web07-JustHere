import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { BellIcon, CogIcon, ShareVariantIcon, StarIcon } from '@/components/Icons'
import Logo from '@/assets/images/logo.svg?react'
import RoomInfoModal from '@/components/main/RoomInfoModal'
import { Button } from '@/components/common/Button'
import type { Participant } from '@/types/domain'
import { getParticipantColor, getParticipantInitial } from '@/utils/participant'

interface HeaderProps {
  participants?: Participant[]
  me?: Participant
  onUpdateName?: (name: string) => void
  isOwner?: boolean
  ownerId?: string
  onTransferOwner?: (targetUserId: string) => void
}

export default function Header({ participants = [], me, onUpdateName, isOwner = false, ownerId, onTransferOwner }: HeaderProps) {
  const [isRoomInfoModalOpen, setIsRoomInfoModalOpen] = useState(false)
  const { pathname } = useLocation()
  const isOnboarding = pathname.startsWith('/onboarding')

  const MAX_DISPLAY_AVATARS = 3
  const combinedParticipants = me ? [me, ...participants.filter(p => p.userId !== me.userId)] : participants
  const hasParticipants = combinedParticipants.length > 0
  const displayCount = Math.min(MAX_DISPLAY_AVATARS, combinedParticipants.length)
  const extraCount = Math.max(combinedParticipants.length - displayCount, 0)

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
      <div className="flex items-center gap-4">
        <Logo />
      </div>

      <div className="flex items-center gap-5">
        {!isOnboarding && (
          <>
            {hasParticipants && (
              <div className="flex items-center -space-x-2">
                {combinedParticipants.slice(0, displayCount).map(p => (
                  <div key={p.userId} className="relative w-9 h-9 overflow-visible">
                    <div
                      className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-sm font-bold text-black overflow-hidden"
                      style={{ backgroundColor: getParticipantColor(p.name) }}
                    >
                      {getParticipantInitial(p.name)}
                    </div>
                    {ownerId && p.userId === ownerId && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-300 border border-yellow-500 shadow-sm">
                        <StarIcon className="w-2.5 h-2.5 text-yellow-900 fill-yellow-900" />
                      </span>
                    )}
                  </div>
                ))}
                {extraCount > 0 && (
                  <div className="z-10 flex items-center justify-center -ml-2 border-2 border-white rounded-full w-9 h-9 bg-gray-100">
                    <span className="text-xs font-medium text-gray-800">+{extraCount}</span>
                  </div>
                )}
              </div>
            )}

            {hasParticipants && <div className="w-[1px] h-6 bg-gray-200" />}
          </>
        )}

        <div className="flex items-center gap-3">
          {!isOnboarding && (
            <div className="relative">
              <Button
                variant="primary"
                size="sm"
                icon={<ShareVariantIcon className="w-[18px] h-[18px]" />}
                onClick={() => setIsRoomInfoModalOpen(true)}
              >
                Share
              </Button>
              <RoomInfoModal
                isOpen={isRoomInfoModalOpen}
                onClose={() => setIsRoomInfoModalOpen(false)}
                userName={me?.name}
                participants={participants}
                me={me}
                onUpdateName={onUpdateName}
                isOwner={isOwner}
                ownerId={ownerId}
                onTransferOwner={onTransferOwner}
              />
            </div>
          )}

          <Button variant="gray" size="icon" className="w-9 h-9">
            <BellIcon className="w-5 h-5" />
          </Button>

          <Button variant="gray" size="icon" className="w-9 h-9">
            <CogIcon className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
