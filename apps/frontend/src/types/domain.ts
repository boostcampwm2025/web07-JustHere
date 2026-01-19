export type RoomMeta = {
  roomId: string
  ownerId: string
}

export type Participant = {
  socketId: string
  userId: string
  name: string
}

export type Category = {
  id: string
  roomId: string
  title: string
  orderIndex: number
  createdAt: string
}
