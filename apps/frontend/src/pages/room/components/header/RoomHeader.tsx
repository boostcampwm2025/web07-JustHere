import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { MapMarkerIcon, ShareVariantIcon } from '@/shared/assets'
import { AvatarList, Button, Divider } from '@/shared/components'
import type { Participant } from '@/shared/types'
import { getOrCreateStoredUser, updateStoredUserName } from '@/shared/utils'
import { Header } from '@/shared/components/header/Header'
import { RoomInfoModal } from './room-info'

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

  // userId 기준으로 중복 제거 (같은 userId가 여러 개 있으면 첫 번째만 유지)
  const uniqueParticipants = participants.filter((p, index, self) => self.findIndex(x => x.userId === p.userId) === index)
  const hasParticipants = uniqueParticipants.length > 0

  return (
    <Header>
      <div className="flex items-center gap-5">
        {currentRegion && (
          <>
            <div className="flex items-center gap-1.5">
              <MapMarkerIcon className="w-4 h-4 text-primary" />
              <span className="text-sm text-gray-700">{currentRegion}</span>
            </div>
            <Divider orientation="vertical" />
          </>
        )}
        {hasParticipants && (
          <Button variant="ghost" className="px-0 rounded-full" onClick={() => setIsRoomInfoModalOpen(true)}>
            <AvatarList participants={uniqueParticipants} ownerId={ownerId} />
          </Button>
        )}
        <div className="relative">
          <Button size="sm" icon={<ShareVariantIcon className="size-4.5" />} onClick={() => setIsRoomInfoModalOpen(true)}>
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
      </div>
    </Header>
  )
}
