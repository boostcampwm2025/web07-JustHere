export type RoomMeta = {
  roomId: string
  me: Participant
  ownerId: string
}

export type Participant = {
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
