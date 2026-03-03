import { Injectable } from '@nestjs/common'
import { UserSessionStore } from './user-session.store'
import { CreateSessionParams } from './user.type'
import { UserSession } from './user'

@Injectable()
export class UserService {
  constructor(private readonly sessions: UserSessionStore) {}

  /**
   * 새 세션 생성 및 저장
   */
  createSession(params: CreateSessionParams): UserSession {
    const isFirstInRoom = this.sessions.listByRoom(params.roomId).length === 0

    const session = new UserSession(params, isFirstInRoom)

    this.sessions.set(params.socketId, session)
    return session
  }

  /**
   * 세션 조회 (세션이 없으면 undefined 반환)
   */
  getSession(socketId: string): UserSession | undefined {
    return this.sessions.get(socketId)
  }

  /**
   * 삭제 후 삭제된 세션을 반환
   */
  removeSession(socketId: string): UserSession | undefined {
    const session = this.sessions.get(socketId)
    if (!session) return undefined

    this.sessions.delete(socketId)
    return session
  }

  /**
   * 방의 모든 유저 조회
   */
  getSessionsByRoom(roomId: string): UserSession[] {
    return this.sessions.listByRoom(roomId)
  }

  /**
   * 세션 이름 업데이트
   */
  updateSessionName(socketId: string, name: string): UserSession | undefined {
    const session = this.sessions.get(socketId)
    if (!session) return undefined

    session.name = name
    this.sessions.set(socketId, session)
    return session
  }

  /**
   * 세션 방장 권한 업데이트
   */
  updateSessionOwner(socketId: string, isOwner: boolean): UserSession | undefined {
    const session = this.sessions.get(socketId)
    if (!session) return undefined

    session.isOwner = isOwner
    this.sessions.set(socketId, session)
    return session
  }

  /**
   * 방장 권한 이전
   */
  transferOwnership(roomId: string, currentOwnerId: string, newOwnerId: string): boolean {
    const currentOwnerSession = this.sessions.findByUserIdInRoom(roomId, currentOwnerId)
    const newOwnerSession = this.sessions.findByUserIdInRoom(roomId, newOwnerId)

    if (!currentOwnerSession || !newOwnerSession) return false
    if (!currentOwnerSession.isOwner) return false

    currentOwnerSession.isOwner = false
    newOwnerSession.isOwner = true

    this.sessions.set(currentOwnerSession.socketId, currentOwnerSession)
    this.sessions.set(newOwnerSession.socketId, newOwnerSession)

    return true
  }

  /**
   * 특정 방에서 userId로 세션 조회
   */
  getSessionByUserIdInRoom(roomId: string, userId: string): UserSession | undefined {
    return this.sessions.findByUserIdInRoom(roomId, userId)
  }
}
