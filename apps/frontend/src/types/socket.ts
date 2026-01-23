import type { Participant, Category, User } from './domain'

// [C->S] room:join
export type RoomJoinPayload = {
  roomId: string
  user: User
}

// [S->C] room:joined
export type RoomJoinedPayload = {
  roomId: string
  participants: Participant[]
  categories: Category[]
  ownerId: string
  place_name?: string
}

// [S->C] participant:connected
export type ParticipantConnectedPayload = {
  socketId: string
  userId: string
  name: string
}

// [S->C] participant:disconnected
export type ParticipantDisconnectedPayload = {
  socketId: string
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

// [S->C] room:region_updated
export type RoomRegionUpdatedPayload = {
  x: number
  y: number
  place_name: string | null
}

// 소켓 에러 타입
export type SocketErrorType = 'NOT_FOUND' | 'NOT_IN_ROOM' | 'NOT_OWNER' | 'TARGET_NOT_FOUND' | 'INTERNAL_SERVER_ERROR' | 'CATEGORY_OVERFLOW_EXCEPTION'

// [S->C] room:error / category:error
export type ErrorPayload = {
  status: 'ERROR'
  statusCode: number
  errorType: SocketErrorType
  message: string
  data?: unknown
  timestamp: string
}
