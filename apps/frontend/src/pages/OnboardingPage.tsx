import { useState } from "react";
import { MapPin } from "lucide-react";
import LocationStep from "@/components/onboarding/LocationStep";
import InviteStep from "@/components/onboarding/InviteStep";

type OnboardingStep = "location" | "invite";

interface SelectedLocation {
  name: string;
  address: string;
}

function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("location");
  const [selectedLocation, setSelectedLocation] =
    useState<SelectedLocation | null>(null);

  // TODO: 실제 초대 링크 생성 로직으로 대체
  const inviteLink = "www.justhere.p-e.kr/abxbdfffdfadff";

  const handleLocationSelect = (location: SelectedLocation) => {
    setSelectedLocation(location);
    setCurrentStep("invite");
  };

  const handleInviteComplete = () => {
    // TODO: 메인 페이지로 이동 또는 다음 플로우 처리
    console.log("Onboarding completed!");
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-bg">
      {/* Header */}
      {/* TODO: 공통 컴포넌트로 빼기 */}
      <header className="flex items-center gap-2 px-6 py-4 bg-white border-b border-gray-200">
        <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
          <MapPin className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-black">Just Here</span>
      </header>

      {/* Step Content */}
      {currentStep === "location" && (
        <LocationStep onNext={handleLocationSelect} />
      )}

      {currentStep === "invite" && selectedLocation && (
        <InviteStep
          selectedLocation={selectedLocation.name}
          inviteLink={inviteLink}
          onComplete={handleInviteComplete}
        />
      )}
    </div>
  );
}

export default OnboardingPage;
