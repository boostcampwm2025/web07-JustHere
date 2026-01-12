import { Injectable } from '@nestjs/common';
import type { Socket } from 'socket.io';
import { UserSessionStore } from './user-session.store';
import type { RoomJoinPayload, RoomLeavePayload } from './dto/room.request.dto';
import { UserSession } from './room.type';

@Injectable()
export class RoomService {
  constructor(private readonly sessions: UserSessionStore) {}

  /**
   * 클라이언트를 룸에 참여시킴
   * 이미 다른 방에 참여 중이면 먼저 나간 후 새 룸에 참여
   *
   * @param client - 소켓 클라이언트
   * @param payload - 룸 참여 정보 (roomId, user)
   */
  async joinRoom(client: Socket, payload: RoomJoinPayload) {
    const { roomId, user } = payload;

    // 이미 다른 방에 참여 중이면 먼저 나가기
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

  /**
   * 클라이언트가 명시적으로 룸을 나갈 때 호출
   * payload의 roomId와 session의 roomId가 일치하는지 검증 후 처리
   *
   * @param client - 소켓 클라이언트
   * @param payload - 룸 나가기 정보 (roomId)
   */
  async leaveRoomBySession(client: Socket, payload: RoomLeavePayload) {
    const session = this.sessions.get(client.id);
    if (!session) return;

    if (payload.roomId !== session.roomId) return;

    await this.leaveRoom(client);
  }

  /**
   * 소켓 연결이 끊어졌을 때 자동으로 호출
   * 세션 정보를 기반으로 룸에서 나가고 세션 삭제
   *
   * @param client - 소켓 클라이언트
   */
  async leaveByDisconnect(client: Socket) {
    await this.leaveRoom(client);
  }

  /**
   * 소켓을 룸에서 나가고 세션 삭제
   *
   * @param client - 소켓 클라이언트
   */
  private async leaveRoom(client: Socket) {
    const session = this.sessions.get(client.id);
    if (!session) return;

    await client.leave(`room:${session.roomId}`);
    this.sessions.delete(client.id);
  }

  /**
   * userId를 기반으로 일관된 컬러를 생성
   * 같은 userId는 항상 같은 컬러를 반환
   *
   * @param userId - 사용자 ID
   * @returns HSL 형식의 컬러 문자열 (예: "hsl(120, 70%, 50%)")
   */
  private generateColor(userId: string): string {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 50%)`;
  }
}
