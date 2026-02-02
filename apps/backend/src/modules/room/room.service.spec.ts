import { CustomException } from '@/lib/exceptions/custom.exception'
import { ErrorType } from '@/lib/types/response.type'
import { RoomActivitySchedulerService } from '@/modules/room/room-activity-scheduler.service'
import { Test, TestingModule } from '@nestjs/testing'
import type { Socket } from 'socket.io'
import type { Category, Room } from '@prisma/client'
import { RoomService } from './room.service'
import { RoomRepository } from './room.repository'
import { CategoryService } from '@/modules/category/category.service'
import { RoomBroadcaster } from '@/modules/socket/room.broadcaster'
import { UserService } from '@/modules/user/user.service'
import type { UserSession } from '@/modules/user/user.type'
import type { RoomJoinPayload } from './dto/room.c2s.dto'
import {
  ParticipantConnectedPayload,
  ParticipantDisconnectedPayload,
  RoomJoinedPayload,
  ParticipantNameUpdatedPayload,
  RoomOwnerTransferredPayload,
} from './dto/room.s2c.dto'
import { VoteService } from '@/modules/vote/vote.service'
import { VoteBroadcaster } from '@/modules/socket/vote.broadcaster'

function createMockSocket(id = 'socket-1') {
  return {
    id,
    join: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
    emit: jest.fn(),
  } as Socket & {
    join: jest.Mock
    leave: jest.Mock
    emit: jest.Mock
  }
}

describe('RoomService', () => {
  let service: RoomService
  let repository: RoomRepository

  const roomId = 'room-1'
  const now = new Date()
  const laterDate = new Date(now.getTime() + 1000)

  const sessionA: UserSession = {
    socketId: 'socket-1',
    userId: 'user-1',
    name: 'ajin',
    roomId,
    color: 'red',
    joinedAt: now,
    isOwner: true,
  }

  const sessionB: UserSession = {
    socketId: 'socket-2',
    userId: 'user-2',
    name: 'kim',
    roomId,
    color: 'blue',
    joinedAt: laterDate,
    isOwner: false,
  }

  const users = {
    getSession: jest.fn(),
    createSession: jest.fn(),
    removeSession: jest.fn(),
    getSessionsByRoom: jest.fn(),
    updateSessionName: jest.fn(),
    getSessionByUserIdInRoom: jest.fn(),
    transferOwnership: jest.fn(),
  }

  const categoryService = {
    findByRoomId: jest.fn(),
  }

  const broadcaster = {
    emitToRoom: jest.fn(),
  }

  const mockRoomScheduler = {
    markAsActive: jest.fn(),
    flushActivityToDb: jest.fn(),
    cleanUpGhostRooms: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomService,
        {
          provide: RoomRepository,
          useValue: {
            createRoom: jest.fn(),
            findBySlug: jest.fn(),
            findById: jest.fn(),
          },
        },
        { provide: UserService, useValue: users },

        { provide: CategoryService, useValue: categoryService },
        { provide: RoomBroadcaster, useValue: broadcaster },
        { provide: RoomActivitySchedulerService, useValue: mockRoomScheduler },
        {
          provide: VoteService,
          useValue: {
            createVote: jest.fn(),
            getVote: jest.fn(),
            revokeAllVotesForUser: jest.fn().mockReturnValue([]),
          },
        },
        {
          provide: VoteBroadcaster,
          useValue: {
            broadcastVote: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<RoomService>(RoomService)
    repository = module.get<RoomRepository>(RoomRepository)
  })

  describe('createRoom', () => {
    it('Repository를 호출하여 방을 생성해야 한다', async () => {
      const mockRoom: Room = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        slug: 'a3k9m2x7',
        x: 127.027621,
        y: 37.497952,
        place_name: '강남역',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActiveAt: new Date(),
      }

      const inputData = {
        x: 127.027621,
        y: 37.497952,
        place_name: '강남역',
      }

      const createRoomSpy = jest.spyOn(repository, 'createRoom').mockResolvedValue(mockRoom)

      const result = await service.createRoom(inputData)

      expect(result).toEqual(mockRoom)
      expect(createRoomSpy).toHaveBeenCalledWith(inputData)
      expect(createRoomSpy).toHaveBeenCalledTimes(1)
    })

    it('place_name 없이 방을 생성할 수 있어야 한다', async () => {
      const mockRoom: Room = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        slug: 'a3k9m2x7',
        x: 127.027621,
        y: 37.497952,
        place_name: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActiveAt: new Date(),
      }

      const inputData = {
        x: 127.027621,
        y: 37.497952,
      }

      const createRoomSpy = jest.spyOn(repository, 'createRoom').mockResolvedValue(mockRoom)

      const result = await service.createRoom(inputData)

      expect(result).toEqual(mockRoom)
      expect(createRoomSpy).toHaveBeenCalledWith(inputData)
    })
  })

  describe('joinRoom', () => {
    it('기존 세션이 없으면: join -> room:joined emit(본인) -> participant:connected broadcast(타인) 순으로 처리', async () => {
      const client = createMockSocket('socket-1')

      const mockCategory: Category = {
        id: 'cat-1',
        roomId,
        title: '카테고리1',
        orderIndex: 0,
        createdAt: now,
      }

      users.getSession.mockReturnValue(null)
      users.createSession.mockReturnValue(sessionA)
      users.getSessionsByRoom.mockReturnValue([sessionA, sessionB])
      categoryService.findByRoomId.mockResolvedValue([mockCategory])
      jest.spyOn(repository, 'findBySlug').mockResolvedValue({ id: roomId } as Room)

      const payload: RoomJoinPayload = {
        roomId,
        user: { userId: 'user-1', name: 'ajin' },
      }

      await service.joinRoom(client, payload)

      expect(client.join).toHaveBeenCalledWith(`room:${roomId}`)

      // 본인에게 room:joined
      const emitCalls = client.emit.mock.calls
      expect(emitCalls.length).toBe(1)

      const [emitEvent, emitPayload] = emitCalls[0] as [string, unknown]
      expect(emitEvent).toBe('room:joined')

      const joinedPayload = emitPayload as RoomJoinedPayload
      expect(joinedPayload.roomId).toBe(roomId)
      expect(Array.isArray(joinedPayload.participants)).toBe(true)
      // 본인 포함 전체 참여자
      expect(joinedPayload.participants).toHaveLength(2)
      expect(joinedPayload.participants.map(p => p.userId)).toContain('user-1')
      expect(joinedPayload.participants.map(p => p.userId)).toContain('user-2')
      expect(joinedPayload.categories).toEqual([mockCategory])
      expect(joinedPayload.ownerId).toBe('user-1') // 가장 먼저 들어온 유저

      const calls = broadcaster.emitToRoom.mock.calls
      expect(calls.length).toBe(1)

      const [calledRoomId, event, payloadArg, options] = calls[0] as [string, string, ParticipantConnectedPayload, object]

      expect(calledRoomId).toBe(roomId)
      expect(event).toBe('participant:connected')
      expect(options).toEqual({ exceptSocketId: 'socket-1' })

      expect(payloadArg.socketId).toBe('socket-1')
      expect(payloadArg.userId).toBe('user-1')
      expect(payloadArg.name).toBe('ajin')
    })

    it('기존 세션이 있으면: leaveRoom 수행 후 새 방 join 처리', async () => {
      const client = createMockSocket('socket-1')

      // 기존 세션 존재 (방장 아님 - 방장 퇴장 시 자동 위임 로직 제외)
      const nonOwnerSession = { ...sessionA, isOwner: false }
      users.getSession.mockReturnValue(nonOwnerSession)
      users.createSession.mockReturnValue(sessionA)
      users.getSessionsByRoom.mockReturnValue([sessionA])
      categoryService.findByRoomId.mockResolvedValue([])
      jest.spyOn(repository, 'findBySlug').mockResolvedValue({ id: roomId } as Room)

      const payload: RoomJoinPayload = {
        roomId,
        user: { userId: 'user-1', name: 'ajin' },
      }

      await service.joinRoom(client, payload)

      // 기존 방 leave 호출됨
      expect(client.leave).toHaveBeenCalledWith(`room:${roomId}`)

      // joinRoom 안에서 (1) participant:disconnected, (2) participant:connected 총 2번 호출됨
      const calls = broadcaster.emitToRoom.mock.calls
      expect(calls.length).toBe(2)

      const [leftRoomId, leftEvent, leftPayload] = calls[0] as [string, string, ParticipantDisconnectedPayload]
      expect(leftRoomId).toBe(roomId)
      expect(leftEvent).toBe('participant:disconnected')

      expect(leftPayload.socketId).toBe('socket-1')
      expect(leftPayload.userId).toBe('user-1')

      expect(users.removeSession).toHaveBeenCalledWith('socket-1')

      // 새 방 join 호출됨
      expect(client.join).toHaveBeenCalledWith(`room:${roomId}`)

      // 두 번째 호출: participant:connected
      const [joinedRoomId, joinedEvent, joinedPayload, joinedOptions] = calls[1] as [string, string, ParticipantConnectedPayload, object]

      expect(joinedRoomId).toBe(roomId)
      expect(joinedEvent).toBe('participant:connected')
      expect(joinedOptions).toEqual({ exceptSocketId: 'socket-1' })

      expect(joinedPayload.socketId).toBe('socket-1')
      expect(joinedPayload.userId).toBe('user-1')
    })

    it('UUID로 방에 참여하면 findBySlug를 호출하지 않음', async () => {
      const client = createMockSocket('socket-1')
      const uuidRoomId = '550e8400-e29b-41d4-a716-446655440000'

      users.getSession.mockReturnValue(null)
      users.createSession.mockReturnValue({ ...sessionA, roomId: uuidRoomId })
      users.getSessionsByRoom.mockReturnValue([{ ...sessionA, roomId: uuidRoomId }])
      categoryService.findByRoomId.mockResolvedValue([])

      jest.spyOn(repository, 'findById').mockResolvedValue({ id: uuidRoomId, place_name: '테스트 지역' } as Room)
      const findBySlugSpy = jest.spyOn(repository, 'findBySlug')

      const payload: RoomJoinPayload = {
        roomId: uuidRoomId,
        user: { userId: 'user-1', name: 'ajin' },
      }

      await service.joinRoom(client, payload)

      expect(findBySlugSpy).not.toHaveBeenCalled()
      expect(client.join).toHaveBeenCalledWith(`room:${uuidRoomId}`)
    })

    it('slug로 방에 참여하면 findBySlug로 UUID를 조회함', async () => {
      const client = createMockSocket('socket-1')
      const slug = 'a3k9m2x7'
      const uuidRoomId = '550e8400-e29b-41d4-a716-446655440000'

      users.getSession.mockReturnValue(null)
      users.createSession.mockReturnValue({ ...sessionA, roomId: uuidRoomId })
      users.getSessionsByRoom.mockReturnValue([{ ...sessionA, roomId: uuidRoomId }])
      categoryService.findByRoomId.mockResolvedValue([])

      const findBySlugSpy = jest.spyOn(repository, 'findBySlug').mockResolvedValue({ id: uuidRoomId } as Room)

      const payload: RoomJoinPayload = {
        roomId: slug,
        user: { userId: 'user-1', name: 'ajin' },
      }

      await service.joinRoom(client, payload)

      expect(findBySlugSpy).toHaveBeenCalledWith(slug)
      expect(client.join).toHaveBeenCalledWith(`room:${uuidRoomId}`)
    })

    it('slug로 방을 찾지 못하면 NotFound 예외를 던진다', async () => {
      const client = createMockSocket('socket-1')
      const slug = 'invalid-slug'

      users.getSession.mockReturnValue(null)
      jest.spyOn(repository, 'findBySlug').mockResolvedValue(null)

      const payload: RoomJoinPayload = {
        roomId: slug,
        user: { userId: 'user-1', name: 'ajin' },
      }

      await expect(service.joinRoom(client, payload)).rejects.toThrow(new CustomException(ErrorType.NotFound, '방을 찾을 수 없습니다.'))

      expect(client.join).not.toHaveBeenCalled()
      expect(users.createSession).not.toHaveBeenCalled()
    })
  })

  describe('leaveRoomBySession', () => {
    it('세션이 없으면 아무것도 하지 않음', async () => {
      const client = createMockSocket('socket-1')
      users.getSession.mockReturnValue(null)

      await service.leaveRoom(client)

      expect(client.leave).not.toHaveBeenCalled()
      expect(users.removeSession).not.toHaveBeenCalled()
      expect(broadcaster.emitToRoom).not.toHaveBeenCalled()
    })

    it('세션이 있으면 leaveRoom 실행', async () => {
      const client = createMockSocket('socket-1')
      // 방장 아닌 세션 사용 (방장 퇴장 시 자동 위임 로직 제외)
      const nonOwnerSession = { ...sessionA, isOwner: false }
      users.getSession.mockReturnValue(nonOwnerSession)

      await service.leaveRoom(client)

      expect(client.leave).toHaveBeenCalledWith(`room:${roomId}`)

      const calls = broadcaster.emitToRoom.mock.calls
      expect(calls.length).toBe(1)

      const [calledRoomId, event, payloadArg] = calls[0] as [string, string, ParticipantDisconnectedPayload]
      expect(calledRoomId).toBe(roomId)
      expect(event).toBe('participant:disconnected')

      expect(payloadArg.socketId).toBe('socket-1')
      expect(payloadArg.userId).toBe('user-1')

      expect(users.removeSession).toHaveBeenCalledWith('socket-1')
    })
  })

  describe('leaveByDisconnect', () => {
    it('disconnect 시에도 leaveRoom 수행', async () => {
      const client = createMockSocket('socket-1')
      // 방장 아닌 세션 사용 (방장 퇴장 시 자동 위임 로직 제외)
      const nonOwnerSession = { ...sessionA, isOwner: false }
      users.getSession.mockReturnValue(nonOwnerSession)

      await service.leaveRoom(client)

      expect(client.leave).toHaveBeenCalledWith(`room:${roomId}`)
      expect(users.removeSession).toHaveBeenCalledWith('socket-1')

      const calls = broadcaster.emitToRoom.mock.calls
      expect(calls.length).toBe(1)

      const [calledRoomId, event] = calls[0] as [string, string]
      expect(calledRoomId).toBe(roomId)
      expect(event).toBe('participant:disconnected')
    })
  })

  describe('getAllParticipants', () => {
    it('룸 세션들을 Participant 배열로 매핑해서 반환', () => {
      users.getSessionsByRoom.mockReturnValue([sessionA, sessionB])

      const participants = service.getAllParticipants(roomId)

      expect(participants).toHaveLength(2)

      expect(participants[0].socketId).toBe('socket-1')
      expect(participants[0].userId).toBe('user-1')
      expect(participants[0].name).toBe('ajin')
      expect(participants[1].socketId).toBe('socket-2')
      expect(participants[1].userId).toBe('user-2')
      expect(participants[1].name).toBe('kim')
    })
  })

  describe('updateParticipantName', () => {
    it('이름을 변경하고 방 전체에 브로드캐스트한다', () => {
      const client = createMockSocket('socket-1')

      users.getSession.mockReturnValue(sessionA)
      users.updateSessionName.mockReturnValue({ ...sessionA, name: 'newName' })

      service.updateParticipantName(client, 'newName')

      expect(users.updateSessionName).toHaveBeenCalledWith('socket-1', 'newName')

      const calls = broadcaster.emitToRoom.mock.calls
      expect(calls.length).toBe(1)

      const [calledRoomId, event, payload] = calls[0] as [string, string, ParticipantNameUpdatedPayload]
      expect(calledRoomId).toBe(roomId)
      expect(event).toBe('participant:name_updated')
      expect(payload.userId).toBe('user-1')
      expect(payload.name).toBe('newName')
    })

    it('세션이 없으면 Unauthorized 예외를 던진다', () => {
      const client = createMockSocket('socket-1')

      users.getSession.mockReturnValue(null)

      expect(() => service.updateParticipantName(client, 'newName')).toThrow(new CustomException(ErrorType.NotInRoom, '세션을 찾을 수 없습니다.'))

      expect(broadcaster.emitToRoom).not.toHaveBeenCalled()
    })

    it('updateSessionName이 실패하면 InternalServerError 예외를 던진다', () => {
      const client = createMockSocket('socket-1')

      users.getSession.mockReturnValue(sessionA)
      users.updateSessionName.mockReturnValue(undefined)

      expect(() => service.updateParticipantName(client, 'newName')).toThrow(
        new CustomException(ErrorType.InternalServerError, '이름 변경에 실패했습니다.'),
      )

      expect(broadcaster.emitToRoom).not.toHaveBeenCalled()
    })
  })

  describe('transferOwner', () => {
    it('방장이 권한을 위임하면 방 전체에 브로드캐스트한다', () => {
      const client = createMockSocket('socket-1')

      users.getSession.mockReturnValue(sessionA) // isOwner: true
      users.getSessionByUserIdInRoom.mockReturnValue(sessionB)
      users.transferOwnership.mockReturnValue(true)

      service.transferOwner(client, 'user-2')

      expect(users.transferOwnership).toHaveBeenCalledWith(roomId, 'user-1', 'user-2')

      const calls = broadcaster.emitToRoom.mock.calls
      expect(calls.length).toBe(1)

      const [calledRoomId, event, payload] = calls[0] as [string, string, RoomOwnerTransferredPayload]
      expect(calledRoomId).toBe(roomId)
      expect(event).toBe('room:owner_transferred')
      expect(payload.previousOwnerId).toBe('user-1')
      expect(payload.newOwnerId).toBe('user-2')
    })

    it('세션이 없으면 NotInRoom 예외를 던진다', () => {
      const client = createMockSocket('socket-1')

      users.getSession.mockReturnValue(null)

      expect(() => service.transferOwner(client, 'user-2')).toThrow(new CustomException(ErrorType.NotInRoom, '세션을 찾을 수 없습니다.'))
    })

    it('방장이 아니면 NotOwner 예외를 던진다', () => {
      const client = createMockSocket('socket-2')
      const notOwnerSession = { ...sessionB, isOwner: false }

      users.getSession.mockReturnValue(notOwnerSession)

      expect(() => service.transferOwner(client, 'user-1')).toThrow(new CustomException(ErrorType.Forbidden, '방장만 권한을 위임할 수 있습니다.'))
    })

    it('대상 유저가 없으면 NotFound 예외를 던진다', () => {
      const client = createMockSocket('socket-1')

      users.getSession.mockReturnValue(sessionA)
      users.getSessionByUserIdInRoom.mockReturnValue(null)

      expect(() => service.transferOwner(client, 'non-existent')).toThrow(
        new CustomException(ErrorType.TargetNotFound, '대상 유저를 찾을 수 없습니다.'),
      )
    })

    it('transferOwnership이 실패하면 InternalServerError 예외를 던진다', () => {
      const client = createMockSocket('socket-1')

      users.getSession.mockReturnValue(sessionA)
      users.getSessionByUserIdInRoom.mockReturnValue(sessionB)
      users.transferOwnership.mockReturnValue(false)

      expect(() => service.transferOwner(client, 'user-2')).toThrow(new CustomException(ErrorType.InternalServerError, '권한 위임에 실패했습니다.'))

      expect(broadcaster.emitToRoom).not.toHaveBeenCalled()
    })
  })

  describe('leaveRoom - 방장 자동 위임', () => {
    it('방장이 퇴장하면 다음 참여자에게 자동으로 방장을 위임한다', async () => {
      const client = createMockSocket('socket-1')
      const ownerSession = { ...sessionA, isOwner: true }
      const nextSession = { ...sessionB, isOwner: false }

      users.getSession.mockReturnValue(ownerSession)
      users.getSessionsByRoom.mockReturnValue([nextSession])

      await service.leaveRoom(client)

      // participant:disconnected + room:owner_transferred
      const calls = broadcaster.emitToRoom.mock.calls
      expect(calls.length).toBe(2)

      const [, disconnectEvent] = calls[0] as [string, string]
      expect(disconnectEvent).toBe('participant:disconnected')

      const [, ownerEvent, ownerPayload] = calls[1] as [string, string, RoomOwnerTransferredPayload]
      expect(ownerEvent).toBe('room:owner_transferred')
      expect(ownerPayload.previousOwnerId).toBe('user-1')
      expect(ownerPayload.newOwnerId).toBe('user-2')
    })

    it('방장이 아닌 사람이 퇴장하면 owner_transferred를 브로드캐스트하지 않는다', async () => {
      const client = createMockSocket('socket-2')
      const memberSession = { ...sessionB, isOwner: false }

      users.getSession.mockReturnValue(memberSession)

      await service.leaveRoom(client)

      const calls = broadcaster.emitToRoom.mock.calls
      expect(calls.length).toBe(1)

      const [, event] = calls[0] as [string, string]
      expect(event).toBe('participant:disconnected')
    })

    it('마지막 참여자(방장)가 퇴장하면 owner_transferred를 브로드캐스트하지 않는다', async () => {
      const client = createMockSocket('socket-1')
      const ownerSession = { ...sessionA, isOwner: true }

      users.getSession.mockReturnValue(ownerSession)
      users.getSessionsByRoom.mockReturnValue([]) // 남은 참여자 없음

      await service.leaveRoom(client)

      const calls = broadcaster.emitToRoom.mock.calls
      expect(calls.length).toBe(1) // participant:disconnected만

      const [, event] = calls[0] as [string, string]
      expect(event).toBe('participant:disconnected')
    })
  })
})
