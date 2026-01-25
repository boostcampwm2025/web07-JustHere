import { MapCheckOutlineIcon, AccountCheckOutlineIcon } from '@/shared/ui/icons/Icons'
import { cn } from '@/shared/utils'

export type OnboardingStep = 'location' | 'invite'

interface OnboardingProgressProps {
  currentStep: OnboardingStep
}

export const OnboardingProgress = ({ currentStep }: OnboardingProgressProps) => {
  const isLocationActive = currentStep === 'location' || currentStep === 'invite'
  const isInviteActive = currentStep === 'invite'

  return (
    <div className="flex items-center justify-center gap-4 mb-10">
      <div className="flex flex-col items-center gap-2">
        <div
          className={cn('w-10 h-10 rounded-full flex items-center justify-center transition-colors', isLocationActive ? 'bg-primary' : 'bg-gray-100')}
        >
          <MapCheckOutlineIcon className={cn('w-5 h-5', isLocationActive ? 'text-white' : 'text-gray-disable')} />
        </div>
        <span className={cn('text-xs font-medium', isLocationActive ? 'text-primary' : 'text-gray-disable')}>지역 선택</span>
      </div>
      <div className={cn('w-24 h-0.5 -mt-6 transition-colors', isInviteActive ? 'bg-primary' : 'bg-gray-200')} />
      <div className="flex flex-col items-center gap-2">
        <div
          className={cn('w-10 h-10 rounded-full flex items-center justify-center transition-colors', isInviteActive ? 'bg-primary' : 'bg-gray-100')}
        >
          <AccountCheckOutlineIcon className={cn('w-5 h-5', isInviteActive ? 'text-white' : 'text-gray-disable')} />
        </div>
        <span className={cn('text-xs font-medium', isInviteActive ? 'text-primary' : 'text-gray-disable')}>사용자 초대</span>
      </div>
    </div>
  )
}
