import { Injectable } from '@nestjs/common';
import { UserSession } from './user.type';

@Injectable()
export class UserSessionStore {
  private readonly connectedUsers = new Map<string, UserSession>();

  get(socketId: string): UserSession | undefined {
    return this.connectedUsers.get(socketId);
  }

  set(socketId: string, session: UserSession): void {
    this.connectedUsers.set(socketId, session);
  }

  delete(socketId: string): void {
    this.connectedUsers.delete(socketId);
  }

  list(): UserSession[] {
    return Array.from(this.connectedUsers.values());
  }

  listByRoom(roomId: string): UserSession[] {
    return this.list().filter((s) => s.roomId === roomId);
  }
}
