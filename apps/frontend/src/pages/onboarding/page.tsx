import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '@/shared/components'
import { socketBaseUrl } from '@/shared/config/socket'
import { useCreateRoom, useToast } from '@/shared/hooks'
import { getErrorCode, reportError, resolveErrorMessage } from '@/shared/utils'
import { LocationStep, InviteStep, OnboardingProgress } from './components'
import type { OnboardingStep, SelectedLocation } from './types'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('location')
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [roomSlug, setRoomSlug] = useState<string | null>(null)

  const { mutate: createRoom } = useCreateRoom()
  const { showToast } = useToast()

  const handleLocationSelect = (location: SelectedLocation) => {
    setSelectedLocation(location)
    createRoom(
      {
        x: location.x,
        y: location.y,
        place_name: location.name,
      },
      {
        onSuccess: room => {
          setRoomSlug(room.slug)
          setInviteLink(`${socketBaseUrl}/room/${room.slug}`)
          setCurrentStep('invite')
        },
        onError: error => {
          const code = getErrorCode(error, 'CLIENT_ROOM_CREATE_FAILED')
          reportError({ error, code, context: { action: 'create_room' } })
          showToast(resolveErrorMessage(error, code), 'error')
        },
      },
    )
  }

  const handleInviteComplete = () => {
    if (!roomSlug) return
    navigate(`/room/${roomSlug}`)
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-bg">
      <Header />

      <div className="flex-1 flex items-start justify-center px-4 py-16">
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-sm p-12">
          <OnboardingProgress currentStep={currentStep} />

          {currentStep === 'location' && <LocationStep onNext={handleLocationSelect} />}

          {currentStep === 'invite' && selectedLocation && inviteLink && (
            <InviteStep selectedLocation={selectedLocation.name} inviteLink={inviteLink} onComplete={handleInviteComplete} />
          )}
        </div>
      </div>
    </div>
  )
}
