import { Category } from '@prisma/client'
import { IsString } from 'class-validator'

// 단순화된 Participant 구조
export class Participant {
  @IsString({ message: 'userId는 문자열이어야 합니다' })
  userId: string

  @IsString({ message: 'name은 문자열이어야 합니다' })
  name: string
}

// [S->C] room:joined - 기존 room:state 대체
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

// [S->C] participant:name_updated
export type ParticipantNameUpdatedPayload = {
  userId: string
  name: string
}

// [S->C] room:owner_transferred
export type RoomOwnerTransferredPayload = {
  previousOwnerId: string
  newOwnerId: string
}
