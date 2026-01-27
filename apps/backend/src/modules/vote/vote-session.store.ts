import { Injectable } from '@nestjs/common'
import { VoteSession } from './vote.type'

@Injectable()
export class VoteSessionStore {
  private readonly voteSessions = new Map<string, VoteSession>()

  get(canvasId: string): VoteSession | undefined {
    return this.voteSessions.get(canvasId)
  }

  set(canvasId: string, session: VoteSession): void {
    this.voteSessions.set(canvasId, session)
  }

  delete(canvasId: string): void {
    this.voteSessions.delete(canvasId)
  }
}
