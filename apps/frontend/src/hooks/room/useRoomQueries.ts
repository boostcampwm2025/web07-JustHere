import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Participant, Category, RoomMeta } from '@/types/domain'
import { createRoom, type RoomRegionPayload } from '@/api/room'

export const roomQueryKeys = {
  base: (roomId: string) => ['room', roomId] as const,
  room: (roomId: string) => ['room', roomId, 'meta'] as const,
  participants: (roomId: string) => ['room', roomId, 'participants'] as const,
  categories: (roomId: string) => ['room', roomId, 'categories'] as const,
}

export function useCreateRoom() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: RoomRegionPayload) => createRoom(payload),
    onSuccess: data => {
      queryClient.setQueryData(roomQueryKeys.base(data.slug), data)
    },
  })
}

export function useRoomMeta(roomId: string | null) {
  return useQuery<RoomMeta | null>({
    queryKey: roomId ? roomQueryKeys.room(roomId) : roomQueryKeys.room('none'),
    queryFn: async () => null,
    enabled: false,
    initialData: null,
  })
}

export function useRoomParticipants(roomId: string | null) {
  return useQuery<Participant[]>({
    queryKey: roomId ? roomQueryKeys.participants(roomId) : roomQueryKeys.participants('none'),
    queryFn: async () => [],
    enabled: false,
    initialData: [],
  })
}

export function useRoomCategories(roomId: string | null) {
  return useQuery<Category[]>({
    queryKey: roomId ? roomQueryKeys.categories(roomId) : roomQueryKeys.categories('none'),
    queryFn: async () => [],
    enabled: false,
    initialData: [],
  })
}
