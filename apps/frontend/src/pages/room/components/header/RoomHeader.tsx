import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { MapMarkerIcon, ChevronDownIcon } from '@/shared/assets'
import { AvatarList, Button, Divider } from '@/shared/components'
import type { Participant } from '@/shared/types'
import { getOrCreateStoredUser, updateStoredUserName, cn } from '@/shared/utils'
import { Header } from '@/shared/components/header/Header'
import { RoomInfoDropdown } from './room-info'
import { RegionSelectorDropdown } from '@/pages/room/components/location/region-selector'

interface RoomHeaderProps {
  participants: Participant[]
  currentUserId: string
  roomLink: string
  onUpdateName?: (name: string) => void
  isOwner?: boolean
  ownerId?: string
  onTransferOwner?: (targetUserId: string) => void
  currentRegion?: string
  onRegionChange?: (region: { x: number; y: number; place_name: string }) => void
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
  onRegionChange,
}: RoomHeaderProps) => {
  const { slug } = useParams<{ slug: string }>()
  const [userName, setUserName] = useState(() => (slug ? getOrCreateStoredUser(slug).name : ''))

  const handleUpdateName = (name: string) => {
    if (!slug) return

    setUserName(name)
    updateStoredUserName(slug, name)
    onUpdateName?.(name)
  }
  const [isRoomInfoDropdownOpen, setIsRoomInfoDropdownOpen] = useState(false)

  const hasParticipants = participants.length > 0

  return (
    <Header>
      <div className="flex items-center gap-5">
        {currentRegion && slug && (
          <>
            <RegionSelectorDropdown
              slug={slug}
              onRegionChange={onRegionChange}
              align="left"
              trigger={({ isOpen, toggle }) => (
                <button
                  type="button"
                  onClick={toggle}
                  className="flex items-center gap-1.5 hover:bg-gray-100 rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors"
                >
                  <MapMarkerIcon className="w-4 h-4 text-primary" />
                  <span className="text-sm text-gray-700">{currentRegion}</span>
                  <ChevronDownIcon className={cn('w-4 h-4 text-gray-400 transition-transform', isOpen && 'rotate-180')} />
                </button>
              )}
            />
            <Divider orientation="vertical" />
          </>
        )}
        {hasParticipants && (
          <Button variant="ghost" className="px-0 rounded-full" onClick={() => setIsRoomInfoDropdownOpen(true)}>
            <AvatarList participants={participants} ownerId={ownerId} />
          </Button>
        )}
      </div>
      <RoomInfoDropdown
        open={isRoomInfoDropdownOpen}
        onOpenChange={setIsRoomInfoDropdownOpen}
        userName={userName}
        roomLink={roomLink}
        participants={participants}
        currentUserId={currentUserId}
        onUpdateName={handleUpdateName}
        isOwner={isOwner}
        ownerId={ownerId}
        onTransferOwner={onTransferOwner}
      />
    </Header>
  )
}
