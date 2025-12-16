import { useParams } from "react-router-dom";
import { Map } from "@/components/Map";
import { useParticipants } from "@/hooks/useParticipants";

export function RoomDetailPage() {
  const { roomId } = useParams<{ roomId: string }>();
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
    <div className="flex justify-center items-end w-screen h-screen overflow-hidden">
      <Map participants={participants} />
    </div>
  );
}
