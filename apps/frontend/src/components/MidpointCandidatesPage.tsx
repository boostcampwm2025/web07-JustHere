import { useParams, useNavigate } from "react-router-dom";
import { useCalculateMidpoints } from "@/hooks/useMidpoints";
import { useParticipants } from "@/hooks/useParticipants";
import { Map } from "@/components/Map";
import { CandidateCardSlider } from "@/components/CandidateCardSlider";
import { useState, useEffect } from "react";

export function MidpointCandidatesPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const roomIdNumber = roomId ? parseInt(roomId, 10) : 0;
  const [isCalculating, setIsCalculating] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(
    null
  );

  const handleCandidateSelect = (candidateId: number) => {
    setSelectedCandidateId(candidateId);
  };
  const calculateMidpointsMutation = useCalculateMidpoints();
  const { data: participants } = useParticipants(roomIdNumber);

  const handleCalculate = async () => {
    if (roomIdNumber === 0) {
      return;
    }

    setIsCalculating(true);
    try {
      await calculateMidpointsMutation.mutateAsync(roomIdNumber);
    } catch (error) {
      console.error("중간 거리 계산 실패:", error);
      alert("중간 거리 계산에 실패했습니다.");
    } finally {
      setIsCalculating(false);
    }
  };

  const handleDecide = (candidateId: number) => {
    const candidate = calculateMidpointsMutation.data?.candidates.find(
      (c) => c.id === candidateId
    );
    if (candidate) {
      // 결정된 후보 정보를 URL 파라미터로 전달하여 인프라 검색 페이지로 이동
      navigate(`/rooms/${roomIdNumber}/infra?midpoint=${candidateId}`);
    }
  };

  // 페이지 진입 시 자동으로 계산
  useEffect(() => {
    if (
      roomIdNumber > 0 &&
      participants &&
      participants.length >= 2 &&
      !calculateMidpointsMutation.data &&
      !isCalculating &&
      !calculateMidpointsMutation.isPending
    ) {
      handleCalculate();
    }
  }, [roomIdNumber, participants]);

  // 계산 결과가 있으면 첫 번째 후보를 기본 선택
  useEffect(() => {
    if (
      calculateMidpointsMutation.data &&
      calculateMidpointsMutation.data.candidates.length > 0 &&
      selectedCandidateId === null
    ) {
      const firstCandidateId = calculateMidpointsMutation.data.candidates[0].id;
      setSelectedCandidateId(firstCandidateId);
    }
  }, [calculateMidpointsMutation.data, selectedCandidateId]);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {participants && participants.length > 0 && (
        <Map
          participants={participants}
          candidates={
            calculateMidpointsMutation.data?.candidates.map((c) => ({
              ...c,
              participantDurations: c.participantDurations,
            })) || []
          }
          selectedCandidateId={selectedCandidateId}
          onCandidateClick={setSelectedCandidateId}
        />
      )}

      {/* 상단 버튼 */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 flex gap-2">
        <button
          onClick={handleCalculate}
          disabled={isCalculating || calculateMidpointsMutation.isPending}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg"
        >
          {isCalculating || calculateMidpointsMutation.isPending
            ? "계산 중..."
            : "중간 거리 계산"}
        </button>
        <button
          onClick={() => navigate(`/rooms/${roomIdNumber}`)}
          className="px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 shadow-lg"
        >
          뒤로가기
        </button>
      </div>

      {/* 후보 카드 슬라이드 */}
      {calculateMidpointsMutation.data &&
        calculateMidpointsMutation.data.candidates.length > 0 && (
          <CandidateCardSlider
            candidates={calculateMidpointsMutation.data.candidates}
            selectedCandidateId={selectedCandidateId}
            onCandidateSelect={handleCandidateSelect}
            onDecide={handleDecide}
          />
        )}
    </div>
  );
}
