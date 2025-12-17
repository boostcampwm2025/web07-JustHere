import { useState, useEffect } from "react";
import { type MidpointCandidate } from "@/api/midpoints";
import { CandidateCard } from "./CandidateCard";

interface CandidateCardSliderProps {
  candidates: MidpointCandidate[];
  selectedCandidateId: number | null;
  onCandidateSelect: (candidateId: number) => void;
  onDecide?: (candidateId: number) => void;
}

export function CandidateCardSlider({
  candidates,
  selectedCandidateId,
  onCandidateSelect,
  onDecide,
}: CandidateCardSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // 선택된 후보가 변경되면 해당 인덱스로 이동
  useEffect(() => {
    if (selectedCandidateId !== null) {
      const index = candidates.findIndex((c) => c.id === selectedCandidateId);
      if (index !== -1) {
        setCurrentIndex(index);
      }
    }
  }, [selectedCandidateId, candidates]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      onCandidateSelect(candidates[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (currentIndex < candidates.length - 1) {
      setCurrentIndex(currentIndex + 1);
      onCandidateSelect(candidates[currentIndex + 1].id);
    }
  };

  const handleCardSelect = (index: number) => {
    setCurrentIndex(index);
    onCandidateSelect(candidates[index].id);
  };

  if (candidates.length === 0) {
    return null;
  }

  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < candidates.length - 1;

  return (
    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
      <div className="relative flex items-center gap-4">
        {/* 이전 버튼 */}
        {candidates.length > 1 && (
          <button
            onClick={handlePrevious}
            disabled={!canGoPrevious}
            className={`w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center ${
              canGoPrevious
                ? "hover:bg-gray-100 cursor-pointer"
                : "opacity-50 cursor-not-allowed"
            }`}
          >
            ←
          </button>
        )}

        {/* 카드 */}
        <div className="relative">
          <CandidateCard
            candidate={candidates[currentIndex]}
            index={currentIndex}
            isSelected={selectedCandidateId === candidates[currentIndex].id}
            onSelect={() => handleCardSelect(currentIndex)}
            onDecide={() => onDecide?.(candidates[currentIndex].id)}
          />
        </div>

        {/* 다음 버튼 */}
        {candidates.length > 1 && (
          <button
            onClick={handleNext}
            disabled={!canGoNext}
            className={`w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center ${
              canGoNext
                ? "hover:bg-gray-100 cursor-pointer"
                : "opacity-50 cursor-not-allowed"
            }`}
          >
            →
          </button>
        )}
      </div>
    </div>
  );
}
