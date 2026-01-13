import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// User 정보 클래스 (nested object)
class RoomJoinUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  id: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  name: string;

  @IsString()
  @IsOptional()
  profile_image?: string;
}

// [C->S] room:join
export class RoomJoinPayload {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  roomId: string;

  @ValidateNested()
  @Type(() => RoomJoinUserDto)
  user: RoomJoinUserDto;
}

// [C->S] room:leave
export class RoomLeavePayload {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  roomId: string;
}
