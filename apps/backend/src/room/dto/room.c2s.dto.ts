import { IsNotEmpty, IsString, Max, MaxLength, maxLength, MinLength, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

class RoomJoinUserDto {
  @IsString({ message: 'userId는 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'userId는 비어있을 수 없습니다' })
  @MinLength(1, { message: 'userId는 최소 1자 이상이어야 합니다' })
  userId: string

  @IsString({ message: 'name은 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'name은 비어있을 수 없습니다' })
  @MinLength(1, { message: 'name은 최소 1자 이상이어야 합니다' })
  name: string
}

// [C->S] room:join
export class RoomJoinPayload {
  @IsString({ message: 'roomId는 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'roomId는 비어있을 수 없습니다' })
  @MinLength(1, { message: 'roomId는 최소 1자 이상이어야 합니다' })
  roomId: string

  @ValidateNested({ message: 'user 정보 형식이 올바르지 않습니다' })
  @Type(() => RoomJoinUserDto)
  user: RoomJoinUserDto
}

// [C->S] room:leave - 빈 payload (세션에서 roomId 조회)
export class RoomLeavePayload {}

// [C->S] participant:update_name
export class ParticipantUpdateNamePayload {
  @IsString({ message: 'name은 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'name은 비어있을 수 없습니다' })
  @MinLength(1, { message: 'name은 최소 1자 이상이어야 합니다' })
  @MaxLength(20, { message: 'name은 최대 20자 이하여야 합니다' })
  name: string
}

// [C->S] room:transfer_owner
export class RoomTransferOwnerPayload {
  @IsString({ message: 'targetUserId는 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'targetUserId는 비어있을 수 없습니다' })
  targetUserId: string
}
