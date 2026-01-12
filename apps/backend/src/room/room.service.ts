import { Injectable } from '@nestjs/common';
import type { Socket, Server } from 'socket.io';
import { UserSessionStore } from './user-session.store';
import type { RoomJoinPayload, RoomLeavePayload } from './dto/room.request.dto';
import type {
  RoomStatePayload,
  RoomUserJoinedPayload,
  RoomUserLeftPayload,
  Participant,
  Category,
  UserSession,
} from './room.type';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class RoomService {
  private server: Server | null = null;

  constructor(
    private readonly sessions: UserSessionStore,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Server 인스턴스를 설정합니다.
   */
  setServer(server: Server) {
    this.server = server;
  }

  /**
   * 클라이언트를 방에 참여시킴
   * 이미 다른 방에 참여 중이면 먼저 나간 후 새 방에 참여
   *
   * @param client - 소켓 클라이언트
   * @param payload - 방 참여 정보 (roomId, user)
   */
  async joinRoom(client: Socket, payload: RoomJoinPayload) {
    const { roomId, user } = payload;

    // 이미 다른 방에 참여 중이면 먼저 나가기
    const existing = this.sessions.get(client.id);
    if (existing) await this.leaveRoom(client);

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

    const participants = this.getParticipants(roomId);
    const categories = await this.getCategories(roomId);

    // 본인에게 room:state 이벤트 전송
    const statePayload: RoomStatePayload = {
      participants,
      categories,
    };
    client.emit('room:state', statePayload);

    // 다른 클라이언트에게 room:user_joined 브로드캐스트
    if (this.server) {
      const joinedPayload: RoomUserJoinedPayload = {
        participant: this.sessionToParticipant(session),
      };
      this.server
        .to(`room:${roomId}`)
        .emit('room:user_joined', joinedPayload, { exceptSocketId: client.id });
    }
  }

  /**
   * 클라이언트가 명시적으로 방을 나갈 때 호출
   * payload의 roomId와 session의 roomId가 일치하는지 검증 후 처리
   *
   * @param client - 소켓 클라이언트
   * @param payload - 방 나가기 정보 (roomId)
   */
  async leaveRoomBySession(client: Socket, payload: RoomLeavePayload) {
    const session = this.sessions.get(client.id);
    if (!session) return;

    if (payload.roomId !== session.roomId) return;

    await this.leaveRoom(client);
  }

  /**
   * 소켓 연결이 끊어졌을 때 자동으로 호출
   * 세션 정보를 기반으로 방에서 나가고 세션 삭제
   *
   * @param client - 소켓 클라이언트
   */
  async leaveByDisconnect(client: Socket) {
    await this.leaveRoom(client);
  }

  /**
   * 소켓을 방에서 나가고 세션 삭제
   *
   * @param client - 소켓 클라이언트
   */
  private async leaveRoom(client: Socket) {
    const session = this.sessions.get(client.id);
    if (!session) return;

    const roomId = session.roomId;
    const participant = this.sessionToParticipant(session);

    await client.leave(`room:${roomId}`);
    this.sessions.delete(client.id);

    // 다른 클라이언트에게 room:user_left 브로드캐스트
    if (this.server) {
      const leftPayload: RoomUserLeftPayload = {
        participant,
      };
      this.server.to(`room:${roomId}`).emit('room:user_left', leftPayload);
    }
  }

  /**
   * 카테고리 목록 조회
   *
   * @param roomId - 방 ID
   * @returns 카테고리 목록
   */
  private async getCategories(roomId: string): Promise<Category[]> {
    const categories = await this.prisma.category.findMany({
      where: { roomId },
      orderBy: { orderIndex: 'asc' },
    });

    return categories.map((cat) => ({
      id: cat.id,
      roomId: cat.roomId,
      title: cat.title,
      orderIndex: cat.orderIndex,
      createdAt: cat.createdAt.toISOString(),
    }));
  }

  /**
   * 방의 모든 참여자 조회
   *
   * @param roomId - 방 ID
   * @returns 참여자 목록
   */
  private getParticipants(roomId: string): Participant[] {
    const sessions = this.sessions.listByRoom(roomId);
    return sessions.map((session) => this.sessionToParticipant(session));
  }

  /**
   * UserSession을 Participant로 변환
   *
   * @param session - 사용자 세션
   * @returns 참여자 정보
   */
  private sessionToParticipant(session: UserSession): Participant {
    return {
      socketId: session.socketId,
      userId: session.userId,
      nickname: session.nickname,
      color: session.color,
      categoryId: session.categoryId,
      joinedAt: session.joinedAt.toISOString(),
    };
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
