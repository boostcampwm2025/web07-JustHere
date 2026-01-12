export type UserSession = {
  socketId: string;
  userId: string;
  nickname: string;
  color: string;
  roomId: string;
  categoryId: string | null;
  joinedAt: Date;
};

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

export type Participant = {
  socketId: string;
  userId: string;
  nickname: string;
  color: string;
  categoryId: string | null;
  joinedAt: string; // ISO 8601 형식
};

export type Category = {
  id: string;
  roomId: string;
  title: string;
  orderIndex: number;
  createdAt: string; // ISO 8601 형식
};
