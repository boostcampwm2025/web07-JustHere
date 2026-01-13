import { useQuery } from '@tanstack/react-query'
import type { Participant, Category, RoomMeta } from '@/types/domain'

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
    queryFn: async () => [],
    enabled: false,
    initialData: [],
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
