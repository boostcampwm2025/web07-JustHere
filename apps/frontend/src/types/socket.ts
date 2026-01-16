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

// [C->S] category:create
export type CategoryCreatePayload = {
  name: string
}

// [C->S] category:delete
export type CategoryDeletePayload = {
  categoryId: string
}

// [S->C] category:created
export type CategoryCreatedPayload = {
  categoryId: string
  name: string
}

// [S->C] category:deleted
export type CategoryDeletedPayload = {
  categoryId: string
}

// [S->C] category:error
export type CategoryErrorPayload = {
  code: string
  message: string
}
