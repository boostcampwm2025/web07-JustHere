import { Avatar } from './Avatar'
import type { Participant } from '@/shared/types'

export interface AvatarListProps {
  participants: Participant[]
  maxDisplay?: number
  ownerId?: string
}

export const AvatarList = ({ participants, maxDisplay = 3, ownerId }: AvatarListProps) => {
  const displayCount = Math.min(maxDisplay, participants.length)
  const extraCount = Math.max(participants.length - displayCount, 0)

  return (
    <div className="flex items-center -space-x-2">
      {participants.slice(0, displayCount).map(p => (
        <Avatar key={p.userId} name={p.name} isOwner={ownerId ? p.userId === ownerId : false} />
      ))}
      {extraCount > 0 && (
        <div className="z-10 flex items-center justify-center border-2 border-white rounded-full w-9 h-9 bg-gray-100">
          <span className="text-xs font-medium text-gray-800">+{extraCount}</span>
        </div>
      )}
    </div>
  )
}
