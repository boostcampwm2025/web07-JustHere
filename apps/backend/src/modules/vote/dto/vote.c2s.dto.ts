import { IsString, IsNotEmpty, MinLength, IsOptional, IsNumber } from 'class-validator'

// [C->S] vote:join
export class VoteJoinPayload {
  @IsString({ message: 'roomId는 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'roomId는 비어있을 수 없습니다' })
  @MinLength(1, { message: 'roomId는 최소 1자 이상이어야 합니다' })
  roomId: string
}

// [C->S] vote:leave
export class VoteLeavePayload {
  @IsString({ message: 'roomId는 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'roomId는 비어있을 수 없습니다' })
  @MinLength(1, { message: 'roomId는 최소 1자 이상이어야 합니다' })
  roomId: string
}

// [C->S] vote:start
export class VoteStartPayload {
  @IsString({ message: 'roomId는 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'roomId는 비어있을 수 없습니다' })
  @MinLength(1, { message: 'roomId는 최소 1자 이상이어야 합니다' })
  roomId: string
}

// [C->S] vote:end
export class VoteEndPayload {
  @IsString({ message: 'roomId는 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'roomId는 비어있을 수 없습니다' })
  @MinLength(1, { message: 'roomId는 최소 1자 이상이어야 합니다' })
  roomId: string
}

// [C->S] vote:candidate:add
export class VoteCandidateAddPayload {
  @IsString({ message: 'roomId는 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'roomId는 비어있을 수 없습니다' })
  @MinLength(1, { message: 'roomId는 최소 1자 이상이어야 합니다' })
  roomId: string

  @IsString({ message: 'placeId는 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'placeId는 비어있을 수 없습니다' })
  @MinLength(1, { message: 'placeId는 최소 1자 이상이어야 합니다' })
  placeId: string

  @IsString({ message: 'name은 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'name은 비어있을 수 없습니다' })
  @MinLength(1, { message: 'name은 최소 1자 이상이어야 합니다' })
  name: string

  @IsString({ message: 'address는 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'address는 비어있을 수 없습니다' })
  @MinLength(1, { message: 'address는 최소 1자 이상이어야 합니다' })
  address: string

  @IsString({ message: 'category는 문자열이어야 합니다' })
  @IsOptional()
  category?: string

  @IsString({ message: 'phone은 문자열이어야 합니다' })
  @IsOptional()
  phone?: string

  @IsString({ message: 'imageUrl은 문자열이어야 합니다' })
  @IsOptional()
  imageUrl?: string

  @IsNumber({}, { message: 'rating은 숫자여야 합니다' })
  @IsOptional()
  rating?: number

  @IsNumber({}, { message: 'ratingCount는 숫자여야 합니다' })
  @IsOptional()
  ratingCount?: number
}

// [C->S] vote:candidate:remove
export class VoteCandidateRemovePayload {
  @IsString({ message: 'roomId는 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'roomId는 비어있을 수 없습니다' })
  @MinLength(1, { message: 'roomId는 최소 1자 이상이어야 합니다' })
  roomId: string

  @IsString({ message: 'candidateId는 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'candidateId는 비어있을 수 없습니다' })
  @MinLength(1, { message: 'candidateId는 최소 1자 이상이어야 합니다' })
  candidateId: string
}

// [C->S] vote:cast
export class VoteCastPayload {
  @IsString({ message: 'roomId는 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'roomId는 비어있을 수 없습니다' })
  @MinLength(1, { message: 'roomId는 최소 1자 이상이어야 합니다' })
  roomId: string

  @IsString({ message: 'candidateId는 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'candidateId는 비어있을 수 없습니다' })
  @MinLength(1, { message: 'candidateId는 최소 1자 이상이어야 합니다' })
  candidateId: string
}

// [C->S] vote:revoke
export class VoteRevokePayload {
  @IsString({ message: 'roomId는 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'roomId는 비어있을 수 없습니다' })
  @MinLength(1, { message: 'roomId는 최소 1자 이상이어야 합니다' })
  roomId: string

  @IsString({ message: 'candidateId는 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'candidateId는 비어있을 수 없습니다' })
  @MinLength(1, { message: 'candidateId는 최소 1자 이상이어야 합니다' })
  candidateId: string
}
