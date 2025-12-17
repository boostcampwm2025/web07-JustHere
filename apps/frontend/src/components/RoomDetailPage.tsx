import { useParams, useNavigate } from "react-router-dom";
import { Map } from "@/components/Map";
import { useParticipants } from "@/hooks/useParticipants";

export function RoomDetailPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const roomIdNumber = roomId ? parseInt(roomId, 10) : 0;
  const { data: participants, isLoading } = useParticipants(roomIdNumber);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center w-screen h-screen">
        <p className="text-lg">로딩 중...</p>
      </div>
    );
  }

  if (!participants?.length) {
    return (
      <div className="flex justify-center items-center w-screen h-screen">
        <p className="text-lg">참여자 없는 방...</p>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <Map participants={participants} />
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
        <button
          onClick={() => navigate(`/rooms/${roomIdNumber}/midpoints`)}
          className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 shadow-lg"
        >
          중간 거리 계산
        </button>
      </div>
    </div>
  );
}
