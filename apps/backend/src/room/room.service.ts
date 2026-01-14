import { Injectable } from '@nestjs/common'
import type { Socket } from 'socket.io'
import { Room } from '@prisma/client'
import { RoomRepository } from './room.repository'
import { CategoryRepository } from '@/category/category.repository'
import { SocketBroadcaster } from '@/socket/socket.broadcaster'
import { UserService } from '@/user/user.service'
import { UserSession } from '@/user/user.type'
import type { ParticipantUpdateNamePayload, RoomJoinPayload } from './dto/room.c2s.dto'
import {
  Participant,
  ParticipantConnectedPayload,
  ParticipantDisconnectedPayload,
  ParticipantNameUpdatedPayload,
  RoomJoinedPayload,
} from './dto/room.s2c.dto'

@Injectable()
export class RoomService {
  constructor(
    private readonly roomRepository: RoomRepository,
    private readonly users: UserService,
    private readonly categories: CategoryRepository,
    private readonly broadcaster: SocketBroadcaster,
  ) {}

  async createRoom(data: { title: string; x: number; y: number; place_name?: string }): Promise<Room> {
    return this.roomRepository.createRoom(data)
  }

  /**
   * 클라이언트를 방에 참여시킴
   * 이미 다른 방에 참여 중이면 먼저 나간 후 새 방에 참여
   */
  async joinRoom(client: Socket, { roomId, user }: RoomJoinPayload) {
    // roomId가 UUID인지 slug인지 판별
    let actualRoomId: string

    if (this.isUUID(roomId)) {
      // UUID면 바로 사용
      actualRoomId = roomId
    } else {
      // slug면 DB에서 UUID 조회
      const room = await this.roomRepository.findBySlug(roomId)
      if (!room) {
        client.emit('error', { message: '방을 찾을 수 없습니다.' })
        return
      }
      actualRoomId = room.id
    }

    // 이미 다른 방에 참여 중이면 먼저 나가기
    const existing = this.users.getSession(client.id)
    if (existing) await this.leaveRoom(client)

    await client.join(`room:${actualRoomId}`)

    const session = this.users.createSession({
      socketId: client.id,
      userId: user.userId,
      name: user.name,
      roomId: actualRoomId,
    })

    // 본인을 포함한 전체 참여자 목록
    const allParticipants = this.getAllParticipants(actualRoomId)
    const categories = await this.categories.findByRoomId(actualRoomId)

    // 본인에게 room:joined 이벤트 전송
    const joinedPayload: RoomJoinedPayload = {
      roomId: actualRoomId,
      me: this.sessionToParticipant(session),
      participants: allParticipants,
      categories,
      ownerId: this.getOwnerId(actualRoomId),
    }
    client.emit('room:joined', joinedPayload)

    // 다른 클라이언트에게 participant:connected 브로드캐스트
    const connectedPayload: ParticipantConnectedPayload = {
      userId: session.userId,
      name: session.name,
    }
    this.broadcaster.emitToRoom(session.roomId, 'participant:connected', connectedPayload, {
      exceptSocketId: client.id,
    })
  }

  /**
   * 클라이언트가 명시적으로 방을 나갈 때 호출
   * 세션에서 roomId를 조회하여 처리
   */
  async leaveRoomBySession(client: Socket) {
    const session = this.users.getSession(client.id)
    if (!session) return

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

    // 다른 클라이언트에게 participant:disconnected 브로드캐스트
    const payload: ParticipantDisconnectedPayload = {
      userId: session.userId,
    }
    this.broadcaster.emitToRoom(session.roomId, 'participant:disconnected', payload)

    this.users.removeSession(client.id)
  }

  /**
   * 참여자 이름 변경
   */
  updateParticipantName(client: Socket, name: string): void {
    const session = this.users.getSession(client.id)
    if (!session) {
      client.emit('error', { message: '세션을 찾을 수 없습니다.' })
      return
    }

    const updatedSession = this.users.updateSessionName(client.id, name)
    if (!updatedSession) return

    // 방의 모든 참여자에게 브로드 캐스트 (본인 포함)
    const payload: ParticipantNameUpdatedPayload = {
      userId: updatedSession.userId,
      name: updatedSession.name,
    }
    this.broadcaster.emitToRoom(session.roomId, 'participant:name_updated', payload)
  }

  /**
   * 방의 전체 참여자 목록 조회
   */
  private getAllParticipants(roomId: string): Participant[] {
    const sessions = this.users.getSessionsByRoom(roomId)
    return sessions.map(session => this.sessionToParticipant(session))
  }

  /**
   * 방의 모든 유저 조회
   */
  getUsersByRoom(roomId: string): Participant[] {
    const sessions = this.users.getSessionsByRoom(roomId)
    return sessions.map(session => this.sessionToParticipant(session))
  }

  /**
   * 방장 ID 조회 (가장 먼저 들어온 유저)
   */
  private getOwnerId(roomId: string): string {
    const sessions = this.users.getSessionsByRoom(roomId)
    if (sessions.length === 0) return ''

    const oldest = sessions.reduce((prev, curr) => (prev.joinedAt < curr.joinedAt ? prev : curr))
    return oldest.userId
  }

  /**
   * UserSession을 Participant로 변환
   */
  private sessionToParticipant(session: UserSession): Participant {
    return {
      userId: session.userId,
      name: session.name,
    }
  }

  /**
   * 문자열이 UUID 형식인지 확인
   */
  private isUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(str)
  }
}
