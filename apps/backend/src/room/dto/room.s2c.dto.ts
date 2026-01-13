import { Category } from '@prisma/client';
import { IsDate, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class Participant {
  @IsString({ message: 'userId는 문자열이어야 합니다' })
  userId: string;

  @IsString({ message: 'nickname은 문자열이어야 합니다' })
  nickname: string;

  @IsString({ message: 'socketId는 문자열이어야 합니다' })
  socketId: string;

  @IsString({ message: 'color는 문자열이어야 합니다' })
  color: string;

  @IsString({ message: 'categoryId는 문자열이어야 합니다' })
  categoryId: string | null;

  @IsDate({ message: 'joinedAt은 날짜 형식이어야 합니다' })
  @Transform(({ value }: { value: string | Date }) =>
    value instanceof Date ? value.toISOString() : value,
  )
  joinedAt: string;
}

// [S->C] room:state
export type RoomStatePayload = {
  participants: Participant[];
  categories: Category[];
};

// [S->C] room:user_joined
export type RoomUserJoinedPayload = {
  participant: Participant;
};

// [S->C] room:user_left
export type RoomUserLeftPayload = {
  participant: Participant;
};

// [S->C] room:user_moved
export type RoomUserMovedPayload = {
  participant: Participant;
  fromCategoryId: string | null;
  toCategoryId: string | null;
};

// [S->C] room:category_changed
export type RoomCategoryChangedPayload = {
  action: 'created' | 'updated' | 'deleted';
  category: Category;
};
