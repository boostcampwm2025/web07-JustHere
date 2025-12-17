import { type MidpointCandidate } from "@/api/midpoints";

interface CandidateCardProps {
  candidate: MidpointCandidate;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDecide?: () => void;
}

export function CandidateCard({
  candidate,
  index,
  isSelected,
  onSelect,
  onDecide,
}: CandidateCardProps) {
  return (
    <div
      className={`bg-white rounded-lg shadow-lg p-6 min-w-[320px] max-w-[400px] cursor-pointer ${
        isSelected ? "ring-2 ring-green-500" : ""
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-green-600">
            #{index + 1} 추천
          </span>
          {isSelected && <span className="text-green-500 text-xl">✓</span>}
        </div>
      </div>

      <h3 className="text-xl font-bold mb-2">{candidate.name}</h3>
      <p className="text-sm text-gray-600 mb-4">
        {candidate.subwayLines.join(", ")}
      </p>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between">
          <span className="text-gray-600">평균 소요시간</span>
          <span className="font-semibold">{candidate.averageDuration}분</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">시간 차이</span>
          <span className="font-semibold">{candidate.timeDifference}분</span>
        </div>
      </div>

      <div className="border-t pt-4">
        <p className="text-sm font-medium text-gray-700 mb-2">
          참가자별 소요 시간
        </p>
        <div className="space-y-1">
          {candidate.participantDurations.map((pd) => (
            <div
              key={pd.participantId}
              className="flex justify-between text-sm"
            >
              <span className="text-gray-600">{pd.participantName}</span>
              <span className="font-medium">{pd.duration}분</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDecide?.();
        }}
        className="mt-4 w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 font-medium"
      >
        이 역으로 결정
      </button>
    </div>
  );
}
