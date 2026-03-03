import { Injectable } from '@nestjs/common'
import { UserSession } from './user'

@Injectable()
export class UserSessionStore {
  // socketId -> UserSession
  private readonly connectedUsers = new Map<string, UserSession>()
  // roomId -> Set<socketId> DB 인덱스 역할
  private readonly roomUsers = new Map<string, Set<string>>()

  get(socketId: string): UserSession | undefined {
    return this.connectedUsers.get(socketId)
  }

  set(socketId: string, session: UserSession): void {
    const existingSession = this.connectedUsers.get(socketId)

    // 방이 변경되었는지 확인 (기존 세션이 있고, roomId가 다를 경우)
    if (existingSession && existingSession.roomId !== session.roomId) {
      this.removeFromRoom(existingSession.roomId, socketId)
    }

    // 룸 인덱스에 추가
    this.addToRoom(session.roomId, socketId)

    // 메인 저장소 업데이트
    this.connectedUsers.set(socketId, session)
  }

  delete(socketId: string): void {
    const session = this.connectedUsers.get(socketId)
    if (session) {
      this.removeFromRoom(session.roomId, socketId)
      this.connectedUsers.delete(socketId)
    }
  }

  list(): UserSession[] {
    return Array.from(this.connectedUsers.values())
  }

  // room 세션을 전체 순회하던 O(N) 로직을 O(1) 로직으로 최적화 -> 인덱스 역할을 하는 roomUsers Map 활용
  listByRoom(roomId: string): UserSession[] {
    const socketIds = this.roomUsers.get(roomId)
    if (!socketIds) {
      return []
    }

    const sessions: UserSession[] = []
    const toRemove: string[] = []

    for (const socketId of socketIds) {
      const session = this.connectedUsers.get(socketId)
      if (session) {
        sessions.push(session)
      } else {
        // 데이터 불일치 시 정리 (방어 코드)
        toRemove.push(socketId)
      }
    }

    // 불일치 데이터 정리
    if (toRemove.length > 0) {
      toRemove.forEach(id => {
        socketIds.delete(id)
      })
    }

    return sessions
  }

  findByUserIdInRoom(roomId: string, userId: string): UserSession | undefined {
    const sessions = this.listByRoom(roomId)
    return sessions.find(s => s.userId === userId)
  }

  private addToRoom(roomId: string, socketId: string): void {
    let room = this.roomUsers.get(roomId)
    if (!room) {
      room = new Set<string>()
      this.roomUsers.set(roomId, room)
    }
    room.add(socketId)
  }

  private removeFromRoom(roomId: string, socketId: string): void {
    const room = this.roomUsers.get(roomId)
    if (room) {
      room.delete(socketId)
      if (room.size === 0) {
        this.roomUsers.delete(roomId)
      }
    }
  }
}
