import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LocationStep from '@/components/onboarding/LocationStep'
import InviteStep from '@/components/onboarding/InviteStep'
import Header from '@/components/common/Header'
import { createRoom } from '@/api/room'

type OnboardingStep = 'location' | 'invite'

interface SelectedLocation {
  name: string
  address: string
  x: number
  y: number
}

function OnboardingPage() {
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
      const baseUrl = import.meta.env.VITE_PUBLIC_BASE_URL ?? window.location.origin
      setRoomSlug(room.slug)
      setInviteLink(`${baseUrl}/room/${room.slug}`)
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
      <Header participants={[]} currentUserId="onboarding" roomLink="" />

      {currentStep === 'location' && <LocationStep onNext={handleLocationSelect} />}

      {currentStep === 'invite' && selectedLocation && inviteLink && (
        <InviteStep selectedLocation={selectedLocation.name} inviteLink={inviteLink} onComplete={handleInviteComplete} />
      )}
    </div>
  )
}

export default OnboardingPage
