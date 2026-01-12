export type UserSession = {
  socketId: string;
  userId: string;
  nickname: string;
  color: string;
  roomId: string;
  categoryId: string | null;
  joinedAt: Date;
};
