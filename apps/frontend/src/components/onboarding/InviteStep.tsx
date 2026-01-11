import { useState } from "react";
// TODO 임시로 라이브러리 적용함. svgr 적용 되면 수정 필요
import { MapPin, Users, Copy, Check } from "lucide-react";

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
        {/* 진행도 바 */}
        {/* TODO 컴포넌트로 빼기 */}
        <div className="flex items-center justify-center gap-4 mb-10">
          {/* Step 1 - Completed */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-medium text-primary">지역 선택</span>
          </div>

          {/* Progress Line */}
          <div className="w-24 h-0.5 bg-primary -mt-6" />

          {/* Step 2 - Active */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-medium text-primary">
              사용자 초대
            </span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-black text-center mb-6">
          참여자 초대
        </h1>

        {/* Description */}
        <p className="text-lg text-black text-center mb-10 leading-relaxed">
          모임 장소가 <span className="font-medium">{selectedLocation}</span>
          으로 확정되었습니다.
          <br />
          친구들에게 링크를 공유하여 초대를 시작해보세요.
        </p>

        {/* Invite Link */}
        <div className="flex items-center gap-2 mb-6 max-w-md mx-auto">
          <div className="flex-1 h-12 px-4 bg-gray-bg border border-gray-300 rounded-xl flex items-center">
            <span className="text-base text-black truncate">
              {truncatedLink}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="w-14 h-12 bg-gray rounded-xl flex items-center justify-center hover:bg-gray-600 transition-colors"
          >
            {copied ? (
              <Check className="w-5 h-5 text-white" />
            ) : (
              <Copy className="w-5 h-5 text-white" />
            )}
          </button>
        </div>

        {/* CTA Button */}
        <button
          onClick={onComplete}
          className="w-full max-w-md mx-auto block h-13 bg-primary hover:bg-primary-pressed text-white font-bold text-base rounded-xl transition-colors py-4"
        >
          시작하기
        </button>
      </div>
    </main>
  );
}

export default InviteStep;
