import { useState } from "react";
import LocationStep from "@/components/onboarding/LocationStep";
import InviteStep from "@/components/onboarding/InviteStep";
import Header from "@/components/common/Header";

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
      <Header />

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
