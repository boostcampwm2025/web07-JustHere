import { useState } from 'react'
import { useParams } from 'react-router-dom'
import Logo from '@/assets/images/logo.svg?react'
import { Button, BellIcon, CogIcon, MapMarkerIcon, ShareVariantIcon, StarIcon } from '@/shared/ui'
import type { Participant } from '@/shared/types'
import { getParticipantColor, getParticipantInitial, getOrCreateStoredUser, updateStoredUserName, cn } from '@/shared/utils'
import { RoomInfoModal } from './RoomInfoModal'

interface RoomHeaderProps {
  participants: Participant[]
  currentUserId: string
  roomLink: string
  onUpdateName?: (name: string) => void
  isOwner?: boolean
  ownerId?: string
  onTransferOwner?: (targetUserId: string) => void
  currentRegion?: string
}

export const RoomHeader = ({
  participants,
  currentUserId,
  roomLink,
  onUpdateName,
  isOwner = false,
  ownerId,
  onTransferOwner,
  currentRegion,
}: RoomHeaderProps) => {
  const { slug } = useParams<{ slug: string }>()
  const [userName, setUserName] = useState(() => (slug ? getOrCreateStoredUser(slug).name : ''))

  const handleUpdateName = (name: string) => {
    if (!slug) return

    setUserName(name)
    updateStoredUserName(slug, name)
    onUpdateName?.(name)
  }
  const [isRoomInfoModalOpen, setIsRoomInfoModalOpen] = useState(false)

  const MAX_DISPLAY_AVATARS = 3
  // userId 기준으로 중복 제거 (같은 userId가 여러 개 있으면 첫 번째만 유지)
  const uniqueParticipants = participants.filter((p, index, self) => self.findIndex(x => x.userId === p.userId) === index)
  const currentUser = uniqueParticipants.find(p => p.userId === currentUserId) ?? { socketId: '', userId: currentUserId, name: userName }
  const combinedParticipants = [currentUser, ...uniqueParticipants.filter(p => p.userId !== currentUser.userId)]
  const hasParticipants = combinedParticipants.length > 0
  const displayCount = Math.min(MAX_DISPLAY_AVATARS, combinedParticipants.length)
  const extraCount = Math.max(combinedParticipants.length - displayCount, 0)

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
      <div className="flex items-center gap-4">
        <Logo />
      </div>

      <div className="flex items-center gap-5">
        {currentRegion && (
          <>
            <div className="flex items-center gap-1.5">
              <MapMarkerIcon className="w-4 h-4 text-primary" />
              <span className="text-sm text-gray-700">{currentRegion}</span>
            </div>
            <div className="w-px h-6 bg-gray-200" />
          </>
        )}
        {hasParticipants && (
          <div className="flex items-center -space-x-2">
            {combinedParticipants.slice(0, displayCount).map(p => (
              <div key={p.userId} className="relative w-9 h-9 overflow-visible">
                <div
                  className={cn(
                    'w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-sm font-bold text-white overflow-hidden',
                    getParticipantColor(p.name),
                  )}
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

        {hasParticipants && <div className="w-px h-6 bg-gray-200" />}

        <div className="flex items-center gap-3">
          <div className="relative">
            <Button
              variant="primary"
              size="sm"
              icon={<ShareVariantIcon className="w-[18px] h-[18px]" />}
              onClick={() => setIsRoomInfoModalOpen(true)}
            >
              Share
            </Button>

            {isRoomInfoModalOpen && (
              <RoomInfoModal
                onClose={() => setIsRoomInfoModalOpen(false)}
                userName={userName}
                roomLink={roomLink}
                participants={participants}
                currentUserId={currentUserId}
                onUpdateName={handleUpdateName}
                isOwner={isOwner}
                ownerId={ownerId}
                onTransferOwner={onTransferOwner}
              />
            )}
          </div>

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
