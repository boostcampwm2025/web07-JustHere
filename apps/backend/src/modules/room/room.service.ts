import { CustomException } from '@/lib/exceptions/custom.exception'
import { ErrorType } from '@/lib/types/response.type'
import { CategoryService } from '@/modules/category/category.service'
import { RoomBroadcaster } from '@/modules/socket/room.broadcaster'
import { UserService } from '@/modules/user/user.service'
import { UserSession } from '@/modules/user/user.type'
import { Injectable } from '@nestjs/common'
import { Room } from '@prisma/client'
import type { Socket } from 'socket.io'
import type { RoomJoinPayload } from './dto/room.c2s.dto'
import {
  Participant,
  ParticipantConnectedPayload,
  ParticipantDisconnectedPayload,
  ParticipantNameUpdatedPayload,
  RoomJoinedPayload,
  RoomOwnerTransferredPayload,
} from './dto/room.s2c.dto'
import { RoomRepository } from './room.repository'

@Injectable()
export class RoomService {
  constructor(
    private readonly roomRepository: RoomRepository,
    private readonly users: UserService,
    private readonly categoryService: CategoryService,
    private readonly broadcaster: RoomBroadcaster,
  ) {}

  async createRoom(data: { x: number; y: number; place_name?: string }): Promise<Room> {
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

      if (!room) throw new CustomException(ErrorType.NotFound, '방을 찾을 수 없습니다.')
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
    const categories = await this.categoryService.findByRoomId(actualRoomId)

    // 본인에게 room:joined 이벤트 전송
    const joinedPayload: RoomJoinedPayload = {
      roomId: actualRoomId,
      participants: allParticipants,
      categories,
      ownerId: this.getOwnerId(actualRoomId),
    }
    client.emit('room:joined', joinedPayload)

    // 다른 클라이언트에게 participant:connected 브로드캐스트
    const connectedPayload: ParticipantConnectedPayload = {
      socketId: session.socketId,
      userId: session.userId,
      name: session.name,
    }
    this.broadcaster.emitToRoom(session.roomId, 'participant:connected', connectedPayload, {
      exceptSocketId: client.id,
    })
  }

  /**
   * 소켓을 방에서 나가고 세션 삭제
   */
  async leaveRoom(client: Socket) {
    const session = this.users.getSession(client.id)
    if (!session) return

    const { roomId } = session
    const wasOwner = session.isOwner

    await client.leave(`room:${roomId}`)

    // 다른 클라이언트에게 participant:disconnected 브로드캐스트
    const payload: ParticipantDisconnectedPayload = {
      socketId: session.socketId,
      userId: session.userId,
    }
    this.broadcaster.emitToRoom(session.roomId, 'participant:disconnected', payload)

    this.users.removeSession(client.id)

    // 방장이 나갔으면 다음 참여자에게 자동 위임
    if (wasOwner) {
      const remainingSessions = this.users.getSessionsByRoom(roomId)
      if (remainingSessions.length > 0) {
        // 가장 먼저 입장한 유저에게 방장 위임
        const nextOwner = remainingSessions.reduce((prev, curr) => (prev.joinedAt < curr.joinedAt ? prev : curr))
        nextOwner.isOwner = true

        // 방장 변경 알림
        const ownerPayload: RoomOwnerTransferredPayload = {
          previousOwnerId: session.userId,
          newOwnerId: nextOwner.userId,
        }
        this.broadcaster.emitToRoom(roomId, 'room:owner_transferred', ownerPayload)
      }
    }
  }

  /**
   * 참여자 이름 변경
   */
  updateParticipantName(client: Socket, name: string): void {
    const session = this.users.getSession(client.id)

    if (!session) throw new CustomException(ErrorType.NotInRoom, '세션을 찾을 수 없습니다.')

    const updatedSession = this.users.updateSessionName(client.id, name)
    if (!updatedSession) {
      throw new CustomException(ErrorType.InternalServerError, '이름 변경에 실패했습니다.')
    }

    // 방의 모든 참여자에게 브로드 캐스트 (본인 포함)
    const payload: ParticipantNameUpdatedPayload = {
      userId: updatedSession.userId,
      name: updatedSession.name,
    }
    this.broadcaster.emitToRoom(session.roomId, 'participant:name_updated', payload)
  }

  /**
   * 방장 권한 위임
   */
  transferOwner(client: Socket, targetUserId: string): void {
    const session = this.users.getSession(client.id)
    if (!session) throw new CustomException(ErrorType.NotInRoom, '세션을 찾을 수 없습니다.')

    // 방장 권한 확인
    if (!session.isOwner) throw new CustomException(ErrorType.NotOwner, '방장만 권한을 위임할 수 있습니다.')

    // 대상 유저 존재 확인
    const targetSession = this.users.getSessionByUserIdInRoom(session.roomId, targetUserId)
    if (!targetSession) throw new CustomException(ErrorType.TargetNotFound, '대상 유저를 찾을 수 없습니다.')

    // 권한 이전
    const success = this.users.transferOwnership(session.roomId, session.userId, targetUserId)
    if (!success) throw new CustomException(ErrorType.InternalServerError, '권한 위임에 실패했습니다.')

    // 방의 모든 참여자에게 브로드캐스트
    const payload: RoomOwnerTransferredPayload = {
      previousOwnerId: session.userId,
      newOwnerId: targetUserId,
    }
    this.broadcaster.emitToRoom(session.roomId, 'room:owner_transferred', payload)
  }

  /**
   * 방의 전체 참여자 목록 조회
   */
  getAllParticipants(roomId: string): Participant[] {
    const sessions = this.users.getSessionsByRoom(roomId)
    return sessions.map(session => this.sessionToParticipant(session))
  }

  /**
   * 방장 ID 조회 (isOwner가 true인 유저, 없으면 가장 먼저 들어온 유저)
   */
  private getOwnerId(roomId: string): string {
    const sessions = this.users.getSessionsByRoom(roomId)
    if (sessions.length === 0) return ''

    // isOwner가 true인 유저 찾기
    const owner = sessions.find(s => s.isOwner)
    if (owner) return owner.userId

    // 없으면 가장 먼저 들어온 유저
    const oldest = sessions.reduce((prev, curr) => (prev.joinedAt < curr.joinedAt ? prev : curr))
    return oldest.userId
  }

  /**
   * UserSession을 Participant로 변환
   */
  private sessionToParticipant(session: UserSession): Participant {
    return {
      socketId: session.socketId,
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
