import type { Participant, Category } from './domain'

// [C->S] room:join
export type RoomJoinPayload = {
  roomId: string
  user: {
    userId: string
    name: string
  }
}

// [S->C] room:joined
export type RoomJoinedPayload = {
  roomId: string
  me: Participant
  participants: Participant[]
  categories: Category[]
  ownerId: string
}

// [S->C] participant:connected
export type ParticipantConnectedPayload = {
  userId: string
  name: string
}

// [S->C] participant:disconnected
export type ParticipantDisconnectedPayload = {
  userId: string
}
