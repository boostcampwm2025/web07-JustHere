import { create } from 'zustand'
import type { Participant, Category } from '@/types/domain'
import type { RoomJoinedPayload, ParticipantConnectedPayload, ParticipantDisconnectedPayload } from '@/types/socket'

type RoomState = {
  roomId: string | null
  me: Participant | null
  participants: Participant[]
  categories: Category[]
  ownerId: string | null

  setJoined: (p: RoomJoinedPayload) => void
  addParticipant: (p: ParticipantConnectedPayload) => void
  removeParticipant: (p: ParticipantDisconnectedPayload) => void
  reset: () => void
}

const initial = {
  roomId: null,
  me: null,
  participants: [],
  categories: [],
  ownerId: null,
}

export const useRoomStore = create<RoomState>(set => ({
  ...initial,

  setJoined: p =>
    set({
      roomId: p.roomId,
      me: p.me,
      participants: p.participants,
      categories: p.categories,
      ownerId: p.ownerId,
    }),

  addParticipant: p =>
    set(s => {
      if (s.participants.some(x => x.userId === p.userId)) return s
      return { participants: [...s.participants, { userId: p.userId, name: p.name }] }
    }),

  removeParticipant: p =>
    set(s => {
      const next = s.participants.filter(x => x.userId !== p.userId)
      if (next.length === s.participants.length) return s
      return { participants: next }
    }),

  reset: () => set(initial),
}))
