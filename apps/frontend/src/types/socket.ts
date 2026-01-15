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

// [C->S] participant:update_name
export type ParticipantUpdateNamePayload = {
  name: string
}

// [S->C] participant:name_updated
export type ParticipantNameUpdatedPayload = {
  userId: string
  name: string
}

// [C->S] room:transfer_owner
export type RoomTransferOwnerPayload = {
  targetUserId: string
}

// [S->C] room:owner_transferred
export type RoomOwnerTransferredPayload = {
  previousOwnerId: string
  newOwnerId: string
}
