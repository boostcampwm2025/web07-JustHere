import { Injectable } from '@nestjs/common';
import { UserSessionStore } from './user-session.store';
import {
  CreateSessionParams,
  MoveCategoryResult,
  UserSession,
} from './user.type';

@Injectable()
export class UserService {
  constructor(private readonly sessions: UserSessionStore) {}

  /**
   * 새 세션 생성 및 저장
   */
  createSession(params: CreateSessionParams): UserSession {
    const session: UserSession = {
      socketId: params.socketId,
      userId: params.userId,
      nickname: params.nickname,
      color: this.generateColor(params.userId),
      roomId: params.roomId,
      categoryId: null,
      joinedAt: new Date(),
    };

    this.sessions.set(params.socketId, session);
    return session;
  }

  /**
   * 세션 조회
   */
  getSession(socketId: string): UserSession | undefined {
    return this.sessions.get(socketId);
  }

  /**
   * 삭제 후 삭제된 세션을 반환
   */
  removeSession(socketId: string): UserSession | undefined {
    const session = this.sessions.get(socketId);
    if (!session) return undefined;

    this.sessions.delete(socketId);
    return session;
  }

  /**
   * 유저의 카테고리 위치 변경
   */
  moveCategory(
    socketId: string,
    toCategoryId: string | null,
  ): MoveCategoryResult | undefined {
    const session = this.sessions.get(socketId);
    if (!session) return undefined;

    const from = session.categoryId;
    session.categoryId = toCategoryId;

    this.sessions.set(socketId, session);
    return { session, from, to: toCategoryId };
  }

  /**
   * 방의 모든 유저 조회
   */
  getSessionsByRoom(roomId: string): UserSession[] {
    return this.sessions.listByRoom(roomId);
  }

  /**
   * userId를 기반으로 일관된 컬러를 생성
   * 같은 userId는 항상 같은 컬러를 반환
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
