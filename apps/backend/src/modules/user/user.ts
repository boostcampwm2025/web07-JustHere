import { CreateSessionParams } from '@/modules/user/user.type'

export class UserSession {
  roomId: string
  socketId: string
  userId: string
  name: string
  color: string
  joinedAt: Date
  isOwner: boolean

  constructor(params: CreateSessionParams, isOwner: boolean) {
    this.roomId = params.roomId
    this.socketId = params.socketId
    this.userId = params.userId
    this.name = params.name
    this.isOwner = isOwner
    this.joinedAt = new Date()
    this.color = this.generateColor(params.userId)
  }

  private generateColor(userId: string): string {
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash)
    }
    const hue = Math.abs(hash % 360)
    return `hsl(${hue}, 70%, 50%)`
  }
}
