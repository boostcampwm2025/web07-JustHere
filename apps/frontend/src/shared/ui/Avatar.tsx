import { StarIcon } from '@/shared/ui/icons/Icons'
import { getParticipantColor, getParticipantInitial, cn } from '@/shared/utils'

export interface AvatarProps {
  name: string
  size?: 'sm' | 'md'
  className?: string
  isOwner?: boolean
  showBorder?: boolean
}

export const Avatar = ({ name, size = 'md', className, isOwner = false, showBorder = false }: AvatarProps) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-[18px]',
    md: 'w-9 h-9 text-sm',
  }

  return (
    <div className={cn('relative inline-block shrink-0', sizeClasses[size], className)}>
      <div
        className={cn(
          'w-full h-full rounded-full flex items-center justify-center font-bold text-white overflow-hidden',
          showBorder && 'border-2 border-white',
          getParticipantColor(name),
        )}
      >
        {getParticipantInitial(name)}
      </div>
      {isOwner && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-300 border border-yellow-500 shadow-sm z-10">
          <StarIcon className="w-2.5 h-2.5 text-yellow-900 fill-yellow-900" />
        </span>
      )}
    </div>
  )
}
