import { Category } from '@prisma/client';
import { IsDate, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

// Participant 클래스
export class Participant {
  @IsString()
  userId: string;

  @IsString()
  nickname: string;

  @IsString()
  socketId: string;

  @IsString()
  color: string;

  @IsString()
  categoryId: string | null;

  @IsDate()
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
