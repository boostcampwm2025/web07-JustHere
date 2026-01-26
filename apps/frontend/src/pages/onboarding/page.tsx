import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '@/shared/components'
import { createRoom } from '@/shared/api/room'
import { socketBaseUrl } from '@/shared/config/socket'
import { LocationStep, InviteStep, OnboardingProgress } from './components'
import type { OnboardingStep, SelectedLocation } from './types'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('location')
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [roomSlug, setRoomSlug] = useState<string | null>(null)

  const handleLocationSelect = async (location: SelectedLocation) => {
    setSelectedLocation(location)

    try {
      const room = await createRoom({
        x: location.x,
        y: location.y,
        place_name: location.name,
      })
      setRoomSlug(room.slug)
      setInviteLink(`${socketBaseUrl}/room/${room.slug}`)
      setCurrentStep('invite')
    } catch (error) {
      console.error('방 생성 실패', error)
    }
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
