import { IsNotEmpty, IsString, MinLength } from 'class-validator'

// [C->S] 기본 페이로드
export class BasePayload {
  @IsString({ message: 'roomId는 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'roomId는 비어있을 수 없습니다' })
  @MinLength(1, { message: 'roomId는 최소 1자 이상이어야 합니다' })
  roomId: string // canvasId
}

// 위 페이로드를 상속하는 DTO를 만들면 됨.
