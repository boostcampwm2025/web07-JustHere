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

  // TODO: 실제 초대 링크 생성 로직으로 대체

  const inviteLink = 'www.justhere.p-e.kr/abxbdfffdfadff'

  const handleLocationSelect = (location: SelectedLocation) => {
    setSelectedLocation(location)
    setCurrentStep('invite')
  }

  const handleInviteComplete = async () => {
    if (!selectedLocation) return

    try {
      await createRoom({
        x: selectedLocation.x,
        y: selectedLocation.y,
        place_name: selectedLocation.name,
      })
      navigate('/main')
    } catch (error) {
      console.error('방 생성 실패', error)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-bg">
      <Header />

      {currentStep === 'location' && <LocationStep onNext={handleLocationSelect} />}

      {currentStep === 'invite' && selectedLocation && (
        <InviteStep selectedLocation={selectedLocation.name} inviteLink={inviteLink} onComplete={handleInviteComplete} />
      )}
    </div>
  )
}

export default OnboardingPage
