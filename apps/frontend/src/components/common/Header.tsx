import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { BellIcon, CogIcon, ShareVariantIcon } from '@/components/Icons'
import Logo from '@/assets/images/logo.svg?react'
import RoomInfoModal from '@/components/main/RoomInfoModal'
import { Button } from '@/components/common/Button'
import type { Participant } from '@/types/domain'
import { getParticipantColor, getParticipantInitial } from '@/utils/participant'

interface HeaderProps {
  participants: Participant[]
  currentUserId: string
  userName: string
  roomLink: string
}

export default function Header({ participants, currentUserId, userName, roomLink }: HeaderProps) {
  const [isRoomInfoModalOpen, setIsRoomInfoModalOpen] = useState(false)
  const { pathname } = useLocation()
  const isOnboarding = pathname.startsWith('/onboarding')

  const MAX_DISPLAY_AVATARS = 3
  const currentUser = participants.find(p => p.userId === currentUserId) ?? { userId: currentUserId, name: userName }
  const combinedParticipants = [currentUser, ...participants.filter(p => p.userId !== currentUser.userId)]
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
            <div className="flex items-center -space-x-2">
              {combinedParticipants.slice(0, displayCount).map(p => (
                <div key={p.userId} className="overflow-hidden border-2 border-white rounded-full w-9 h-9">
                  <div
                    className="w-full h-full flex items-center justify-center text-sm font-bold text-black"
                    style={{ backgroundColor: getParticipantColor(p.name) }}
                  >
                    {getParticipantInitial(p.name)}
                  </div>
                </div>
              ))}
              {extraCount > 0 && (
                <div className="z-10 flex items-center justify-center -ml-2 border-2 border-white rounded-full w-9 h-9 bg-gray-100">
                  <span className="text-xs font-medium text-gray-800">+{extraCount}</span>
                </div>
              )}
            </div>

            <div className="w-[1px] h-6 bg-gray-200" />
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
                userName={userName}
                currentUserId={currentUserId}
                roomLink={roomLink}
                participants={participants}
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
