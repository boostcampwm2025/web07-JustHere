import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LocationStep } from '@/components/onboarding/LocationStep'
import { InviteStep } from '@/components/onboarding/InviteStep'
import { Header } from '@/shared/ui/Header'
import { createRoom } from '@/api/room'
import { socketBaseUrl } from '@/config/socket'

type OnboardingStep = 'location' | 'invite'

interface SelectedLocation {
  name: string
  address: string
  x: number
  y: number
}

export function OnboardingPage() {
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
      <Header minimal />

      {currentStep === 'location' && <LocationStep onNext={handleLocationSelect} />}

      {currentStep === 'invite' && selectedLocation && inviteLink && (
        <InviteStep selectedLocation={selectedLocation.name} inviteLink={inviteLink} onComplete={handleInviteComplete} />
      )}
    </div>
  )
}
