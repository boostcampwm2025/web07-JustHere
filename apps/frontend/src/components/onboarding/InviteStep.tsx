import { useState } from "react";
import { ContentCopyIcon, CheckIcon } from "@/components/Icons";
import { Button } from "@/components/common/Button";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";

interface InviteStepProps {
  selectedLocation: string;
  inviteLink: string;
  onComplete: () => void;
}

function InviteStep({
  selectedLocation,
  inviteLink,
  onComplete,
}: InviteStepProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const truncatedLink =
    inviteLink.length > 35 ? `${inviteLink.slice(0, 35)}..` : inviteLink;

  return (
    <main className="flex-1 flex items-start justify-center px-4 py-16">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-sm p-12">
        <OnboardingProgress currentStep="invite" />

        <h1 className="text-3xl font-bold text-black text-center mb-6">
          참여자 초대
        </h1>

        <p className="text-lg text-black text-center mb-10 leading-relaxed">
          모임 장소가 <span className="font-medium">{selectedLocation}</span>
          으로 확정되었습니다.
          <br />
          친구들에게 링크를 공유하여 초대를 시작해보세요.
        </p>

        <div className="flex items-center gap-2 mb-6 max-w-md mx-auto">
          <div className="flex-1 h-12 px-4 bg-gray-bg border border-gray-300 rounded-xl flex items-center">
            <span className="text-base text-black truncate">
              {truncatedLink}
            </span>
          </div>
          <Button
            onClick={handleCopy}
            className="w-14 h-12 bg-gray text-white hover:bg-gray-600 rounded-xl p-0 flex items-center justify-center shrink-0"
            variant="ghost"
          >
            {copied ? (
              <CheckIcon className="w-5 h-5 text-white" />
            ) : (
              <ContentCopyIcon className="w-5 h-5 text-white" />
            )}
          </Button>
        </div>

        <Button
          onClick={onComplete}
          size="lg"
          className="w-full max-w-md mx-auto block h-13 py-4 text-base font-bold"
        >
          시작하기
        </Button>
      </div>
    </main>
  );
}

export default InviteStep;
