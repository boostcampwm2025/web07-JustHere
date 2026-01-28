import { Injectable } from '@nestjs/common'
import type { Server } from 'socket.io'

@Injectable()
export class VoteBroadcaster {
  private server: Server | null = null

  setServer(server: Server) {
    this.server = server
  }

  emitToVote<T>(roomId: string, event: string, payload: T, options?: { exceptSocketId?: string }) {
    if (!this.server) return

    const room = this.server.to(`vote:${roomId}`)
    if (options?.exceptSocketId) {
      room.except(options.exceptSocketId).emit(event, payload)
      return
    }

    room.emit(event, payload)
  }
}
