import { Category } from '@prisma/client'
import { IsString } from 'class-validator'

// 단순화된 Participant 구조
export class Participant {
  @IsString({ message: 'socketId는 문자열이어야 합니다' })
  socketId: string

  @IsString({ message: 'userId는 문자열이어야 합니다' })
  userId: string

  @IsString({ message: 'name은 문자열이어야 합니다' })
  name: string
}

// [S->C] room:joined
export type RoomJoinedPayload = {
  roomId: string
  participants: Participant[]
  categories: Category[]
  ownerId: string
  place_name: string | null
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

// [S->C] room:region_updated
export type RoomRegionUpdatedPayload = {
  x: number
  y: number
  place_name: string | null
}
