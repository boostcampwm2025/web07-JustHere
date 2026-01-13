import { useQuery } from '@tanstack/react-query'
import type { Participant, Category } from '@/types/domain'

type RoomMeta = { roomId: string; me: Participant; ownerId: string }

export const roomQueryKeys = {
  room: (roomId: string) => ['room', roomId] as const,
  participants: (roomId: string) => ['roomParticipants', roomId] as const,
  categories: (roomId: string) => ['roomCategories', roomId] as const,
}

export function useRoomMeta(roomId: string | null) {
  return useQuery<RoomMeta | null>({
    queryKey: roomId ? roomQueryKeys.room(roomId) : ['room', 'none'],
    queryFn: async () => null,
    enabled: false,
    initialData: null,
  })
}

export function useRoomParticipants(roomId: string | null) {
  return useQuery<Participant[]>({
    queryKey: roomId ? roomQueryKeys.participants(roomId) : ['roomParticipants', 'none'],
    queryFn: async () => [], // REST로 가져올 거면 여기 구현. 지금은 소켓이 채움.
    enabled: false, // 소켓 기반이면 fetch 필요 없음. 캐시만 씀.
    initialData: [], // 하위 컴포넌트 안전
  })
}

export function useRoomCategories(roomId: string | null) {
  return useQuery<Category[]>({
    queryKey: roomId ? roomQueryKeys.categories(roomId) : ['roomCategories', 'none'],
    queryFn: async () => [],
    enabled: false,
    initialData: [],
  })
}
