import { StarIcon } from '@/shared/assets'
import { cn, getParticipantColor, getParticipantInitial } from '@/shared/utils'

export interface AvatarProps {
  name: string
  isOwner?: boolean
}

export const Avatar = ({ name, isOwner = false }: AvatarProps) => {
  return (
    <div className="relative inline-block shrink-0 size-9">
      <div
        className={cn(
          'w-full h-full rounded-full flex items-center justify-center font-bold text-white overflow-hidden border-2 border-white',
          getParticipantColor(name),
        )}
      >
        <span className="text-sm font-bold text-white">{getParticipantInitial(name)}</span>
      </div>

      {isOwner && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-300 border border-yellow-500 shadow-sm z-10">
          <StarIcon className="w-2.5 h-2.5 text-yellow-700 fill-yellow-700" />
        </span>
      )}
    </div>
  )
}
