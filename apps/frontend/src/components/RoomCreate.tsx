import { useMutation } from "@tanstack/react-query";
import { createRoom, type RoomResponse } from "@/api/rooms";

export function RoomCreate() {
  const mutation = useMutation<RoomResponse, Error>({
    mutationFn: createRoom,
    onError: (error) => {
      console.error("Room creation error:", error);
    },
  });

  const handleCreateRoom = () => {
    mutation.mutate();
  };

  return (
    <div className="p-4">
      <button
        onClick={handleCreateRoom}
        disabled={mutation.isPending}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {mutation.isPending ? "생성 중..." : "방 만들기"}
      </button>

      {mutation.isError && (
        <p className="text-red-500 mt-2">
          방 생성에 실패했습니다: {mutation.error.message}
        </p>
      )}

      {mutation.isSuccess && mutation.data && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <p>방 ID: {mutation.data.id}</p>
          <p>생성 시각: {new Date(mutation.data.createdAt).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}
