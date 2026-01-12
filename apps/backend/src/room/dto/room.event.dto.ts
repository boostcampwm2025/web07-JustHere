import { Category } from '@prisma/client';

import { z } from 'zod';

export const participantSchema = z.object({
  userId: z.string(),
  nickname: z.string(),
  socketId: z.string(),
  color: z.string(),
  categoryId: z.string().nullable(),
  joinedAt: z.preprocess(
    (v) => (v instanceof Date ? v.toISOString() : v),
    z.iso.datetime(),
  ),
});
export type Participant = z.infer<typeof participantSchema>;

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
