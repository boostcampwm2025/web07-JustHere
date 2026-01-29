import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator'

// [C->S] 기본 페이로드
export class BasePayload {
  @IsString({ message: 'roomId는 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'roomId는 비어있을 수 없습니다' })
  roomId: string

  @IsString({ message: 'categoryId는 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'categoryId는 비어있을 수 없습니다' })
  categoryId: string

  @IsOptional()
  @IsString({ message: 'userId는 문자열이어야 합니다' })
  userId?: string
}

// [C->S] vote:join
export class VoteJoinPayload extends BasePayload {}

// [C->S] vote:leave
export class VoteLeavePayload extends BasePayload {}

// [C->S] vote:start
export class VoteStartPayload extends BasePayload {}

// [C->S] vote:end
export class VoteEndPayload extends BasePayload {}

// [C->S] vote:candidate:add
export class VoteCandidateAddPayload extends BasePayload {
  @IsString({ message: 'placeId는 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'placeId는 비어있을 수 없습니다' })
  placeId: string

  @IsString({ message: 'name은 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'name은 비어있을 수 없습니다' })
  name: string

  @IsString({ message: 'address는 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'address는 비어있을 수 없습니다' })
  address: string

  @IsOptional()
  @IsString({ message: 'category는 문자열이어야 합니다' })
  category?: string

  @IsOptional()
  @IsString({ message: 'phone은 문자열이어야 합니다' })
  phone?: string

  @IsOptional()
  @IsString({ message: 'imageUrl은 문자열이어야 합니다' })
  imageUrl?: string

  @IsOptional()
  @IsNumber({}, { message: 'rating은 숫자여야 합니다' })
  rating?: number

  @IsOptional()
  @IsNumber({}, { message: 'ratingCount는 숫자여야 합니다' })
  ratingCount?: number
}

// [C->S] vote:candidate:remove
export class VoteCandidateRemovePayload extends BasePayload {
  @IsString({ message: 'candidateId는 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'candidateId는 비어있을 수 없습니다' })
  candidateId: string
}

// [C->S] vote:cast
export class VoteCastPayload extends BasePayload {
  @IsString({ message: 'candidateId는 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'candidateId는 비어있을 수 없습니다' })
  candidateId: string
}

// [C->S] vote:revoke
export class VoteRevokePayload extends BasePayload {
  @IsString({ message: 'candidateId는 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'candidateId는 비어있을 수 없습니다' })
  candidateId: string
}
