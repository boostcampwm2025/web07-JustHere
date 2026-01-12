import { Injectable } from '@nestjs/common';
import type { Socket } from 'socket.io';
import { UserSessionStore } from './user-session.store';
import type { RoomJoinPayload, RoomLeavePayload } from './dto/room.request.dto';
import { UserSession } from './room.type';

@Injectable()
export class RoomService {
  constructor(private readonly sessions: UserSessionStore) {}

  async joinRoom(client: Socket, payload: RoomJoinPayload) {
    const { roomId, user } = payload;

    const existing = this.sessions.get(client.id);
    if (existing) {
      await client.leave(`room:${existing.roomId}`);
    }

    await client.join(`room:${roomId}`);

    const session: UserSession = {
      socketId: client.id,
      userId: user.id,
      nickname: user.name,
      color: this.generateColor(user.id),
      roomId,
      categoryId: null,
      joinedAt: new Date(),
    };
    this.sessions.set(client.id, session);
  }

  async leaveRoom(client: Socket, payload: RoomLeavePayload) {
    const { roomId } = payload;
    const session = this.sessions.get(client.id);
    if (!session) return;

    if (session.roomId !== roomId) return;

    await client.leave(`room:${roomId}`);
    this.sessions.delete(client.id);
  }

  async leaveByDisconnect(client: Socket) {
    const session = this.sessions.get(client.id);
    if (!session) return;

    await client.leave(`room:${session.roomId}`);
    this.sessions.delete(client.id);
  }

  private generateColor(userId: string): string {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 50%)`;
  }
}
