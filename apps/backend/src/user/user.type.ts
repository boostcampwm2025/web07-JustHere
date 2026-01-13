export type UserSession = {
  roomId: string
  socketId: string
  userId: string
  nickname: string
  color: string
  categoryId: string | null
  joinedAt: Date
}

export type CreateSessionParams = {
  roomId: string
  socketId: string
  userId: string
  nickname: string
}

export type MoveCategoryResult = {
  session: UserSession
  from: string | null
  to: string | null
}
