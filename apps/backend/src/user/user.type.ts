export type UserSession = {
  roomId: string
  socketId: string
  userId: string
  name: string
  color: string
  joinedAt: Date
  isOwner: boolean
}

export type CreateSessionParams = {
  roomId: string
  socketId: string
  userId: string
  name: string
}
