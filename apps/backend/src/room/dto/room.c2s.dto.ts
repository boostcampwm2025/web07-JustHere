import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class RoomJoinUserDto {
  @IsString({ message: 'id는 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'id는 비어있을 수 없습니다' })
  @MinLength(1, { message: 'id는 최소 1자 이상이어야 합니다' })
  id: string;

  @IsString({ message: 'name은 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'name은 비어있을 수 없습니다' })
  @MinLength(1, { message: 'name은 최소 1자 이상이어야 합니다' })
  name: string;

  @IsString({ message: 'profile_image는 문자열이어야 합니다' })
  @IsOptional()
  profile_image?: string;
}

// [C->S] room:join
export class RoomJoinPayload {
  @IsString({ message: 'roomId는 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'roomId는 비어있을 수 없습니다' })
  @MinLength(1, { message: 'roomId는 최소 1자 이상이어야 합니다' })
  roomId: string;

  @ValidateNested({ message: 'user 정보 형식이 올바르지 않습니다' })
  @Type(() => RoomJoinUserDto)
  user: RoomJoinUserDto;
}

// [C->S] room:leave
export class RoomLeavePayload {
  @IsString({ message: 'roomId는 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'roomId는 비어있을 수 없습니다' })
  @MinLength(1, { message: 'roomId는 최소 1자 이상이어야 합니다' })
  roomId: string;
}
