import { createRoom, updateRoom, type RoomRegionPayload, getVoteResults } from '@/shared/api'
import type { Category, Participant, RoomMeta } from '@/shared/types'
import { useMutation, useQuery } from '@tanstack/react-query'

export const roomQueryKeys = {
  base: (roomId: string) => ['room', roomId] as const,
  room: (roomId: string) => ['room', roomId, 'meta'] as const,
  participants: (roomId: string) => ['room', roomId, 'participants'] as const,
  categories: (roomId: string) => ['room', roomId, 'categories'] as const,
}

export function useCreateRoom() {
  return useMutation({
    mutationFn: (payload: RoomRegionPayload) => createRoom(payload),
  })
}

export function useUpdateRoom(slug: string) {
  return useMutation({
    mutationFn: (payload: RoomRegionPayload) => updateRoom(slug, payload),
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

export const useRoomParticipants = (roomId: string | null) => {
  return useQuery<Participant[]>({
    queryKey: roomId ? roomQueryKeys.participants(roomId) : roomQueryKeys.participants('none'),
    queryFn: async () => [],
    enabled: false,
    initialData: [],
    select: data => data.filter((p, index, self) => self.findIndex(x => x.userId === p.userId) === index),
  })
}

export const useRoomCategories = (roomId: string | null) => {
  return useQuery<Category[]>({
    queryKey: roomId ? roomQueryKeys.categories(roomId) : roomQueryKeys.categories('none'),
    queryFn: async () => [],
    enabled: !!roomId,
    initialData: [],
  })
}

export const useVoteResults = (roomId: string) => {
  return useQuery({
    queryKey: ['voteResults', roomId],
    queryFn: () => getVoteResults(roomId),
    enabled: !!roomId,
    staleTime: 0,
  })
}
