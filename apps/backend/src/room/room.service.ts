import { Injectable } from '@nestjs/common'
import { Category } from '@prisma/client'
import { plainToInstance } from 'class-transformer'
import type { Socket } from 'socket.io'
import { CategoryRepository } from '@/category/category.repository'
import { SocketBroadcaster } from '@/socket/socket.broadcaster'
import { UserService } from '@/user/user.service'
import { UserSession } from '@/user/user.type'
import type { RoomJoinPayload, RoomLeavePayload } from './dto/room.c2s.dto'
import {
  Participant,
  RoomCategoryChangedPayload,
  RoomStatePayload,
  RoomUserJoinedPayload,
  RoomUserLeftPayload,
  RoomUserMovedPayload,
} from './dto/room.s2c.dto'

@Injectable()
export class RoomService {
  constructor(
    private readonly users: UserService,
    private readonly categories: CategoryRepository,
    private readonly broadcaster: SocketBroadcaster,
  ) {}

  /**
   * 클라이언트를 방에 참여시킴
   * 이미 다른 방에 참여 중이면 먼저 나간 후 새 방에 참여
   */
  async joinRoom(client: Socket, { roomId, user }: RoomJoinPayload) {
    // 이미 다른 방에 참여 중이면 먼저 나가기
    const existing = this.users.getSession(client.id)
    if (existing) await this.leaveRoom(client)

    await client.join(`room:${roomId}`)

    const session = this.users.createSession({
      socketId: client.id,
      userId: user.id,
      nickname: user.name,
      roomId,
    })

    const participants = this.getUsersByRoom(roomId)
    const categories = await this.categories.findByRoomId(roomId)

    // 본인에게 room:state 이벤트 전송
    const statePayload: RoomStatePayload = { participants, categories }
    client.emit('room:state', statePayload)

    // 다른 클라이언트에게 room:user_joined 브로드캐스트
    const userPayload: RoomUserJoinedPayload = {
      participant: this.sessionToParticipant(session),
    }
    this.broadcaster.emitToRoom(session.roomId, 'room:user_joined', userPayload, {
      exceptSocketId: client.id,
    })
  }

  /**
   * 클라이언트가 명시적으로 방을 나갈 때 호출
   * payload의 roomId와 session의 roomId가 일치하는지 검증 후 처리
   */
  async leaveRoomBySession(client: Socket, { roomId }: RoomLeavePayload) {
    const session = this.users.getSession(client.id)
    if (!session) return

    if (roomId !== session.roomId) return

    await this.leaveRoom(client)
  }

  /**
   * 소켓 연결이 끊어졌을 때 자동으로 호출
   * 세션 정보를 기반으로 방에서 나가고 세션 삭제
   */
  async leaveByDisconnect(client: Socket) {
    await this.leaveRoom(client)
  }

  /**
   * 소켓을 방에서 나가고 세션 삭제
   */
  private async leaveRoom(client: Socket) {
    const session = this.users.getSession(client.id)
    if (!session) return

    const { roomId } = session

    await client.leave(`room:${roomId}`)

    // 다른 클라이언트에게 room:user_left 브로드캐스트
    const payload: RoomUserLeftPayload = {
      participant: this.sessionToParticipant(session),
    }
    this.broadcaster.emitToRoom(session.roomId, 'room:user_left', payload)

    this.users.removeSession(client.id)
  }

  /**
   * 방의 모든 유저 조회
   */
  getUsersByRoom(roomId: string): Participant[] {
    const sessions = this.users.getSessionsByRoom(roomId)
    return sessions.map(session => this.sessionToParticipant(session))
  }

  /**
   * 사용자가 카테고리를 변경했을 때 브로드캐스트
   */
  broadcastUserMoved(socketId: string, _from: string | null, to: string | null) {
    // 유저 입력과 소켓 세션 기반으로 위치 변경 처리
    const moved = this.users.moveCategory(socketId, to)
    if (!moved) return

    const payload: RoomUserMovedPayload = {
      participant: this.sessionToParticipant(moved.session),
      fromCategoryId: moved.from,
      toCategoryId: moved.to,
    }

    this.broadcaster.emitToRoom(moved.session.roomId, 'room:user_moved', payload)
  }

  /**
   * 카테고리 CRUD 변경 시 브로드캐스트
   */
  broadcastCategoryChanged(roomId: string, action: 'created' | 'updated' | 'deleted', category: Category) {
    const payload: RoomCategoryChangedPayload = {
      action,
      category,
    }

    this.broadcaster.emitToRoom(roomId, 'room:category_changed', payload)
  }

  /**
   * UserSession을 Participant로 변환
   */
  private sessionToParticipant(session: UserSession) {
    return plainToInstance(Participant, { ...session })
  }
}
