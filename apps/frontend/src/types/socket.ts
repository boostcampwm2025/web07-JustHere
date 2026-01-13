import type { Participant, Category } from './domain'

// [C->S] room:join 페이로드
export type RoomJoinPayload = {
  roomId: string
  user: {
    userId: string
    name: string
  }
}

// [S->C] room:joined 페이로드
export type RoomJoinedPayload = {
  roomId: string
  me: Participant
  participants: Participant[]
  categories: Category[]
  ownerId: string
}

// [S->C] participant:connected 페이로드
export type ParticipantConnectedPayload = {
  userId: string
  name: string
}

// [S->C] participant:disconnected 페이로드
export type ParticipantDisconnectedPayload = {
  userId: string
}
