import { Test, TestingModule } from '@nestjs/testing'
import type { Server, Socket } from 'socket.io'
import type { ValidationError } from 'class-validator'
import * as classValidator from 'class-validator'

import { RoomGateway } from './room.gateway'
import { RoomService } from './room.service'
import { SocketBroadcaster } from '@/socket/socket.broadcaster'
import { RoomJoinPayload, RoomLeavePayload } from './dto/room.c2s.dto'

describe('RoomGateway', () => {
  let gateway: RoomGateway

  const roomService = {
    leaveByDisconnect: jest.fn(),
    joinRoom: jest.fn(),
    leaveRoomBySession: jest.fn(),
  }

  const broadcaster = {
    setServer: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomGateway, { provide: RoomService, useValue: roomService }, { provide: SocketBroadcaster, useValue: broadcaster }],
    }).compile()

    gateway = module.get(RoomGateway)
  })

  describe('afterInit', () => {
    it('Gateway 초기화 시 SocketBroadcaster에 서버를 주입한다', () => {
      const server = {} as Server

      gateway.afterInit(server)

      expect(broadcaster.setServer).toHaveBeenCalledTimes(1)
      expect(broadcaster.setServer).toHaveBeenCalledWith(server)
    })
  })

  describe('handleDisconnect', () => {
    it('소켓 연결 해제 시 RoomService.leaveByDisconnect를 호출한다', async () => {
      const client = {} as Socket

      await gateway.handleDisconnect(client)

      expect(roomService.leaveByDisconnect).toHaveBeenCalledTimes(1)
      expect(roomService.leaveByDisconnect).toHaveBeenCalledWith(client)
    })
  })

  describe('onRoomJoin', () => {
    it('유효한 payload가 전달되면 RoomService.joinRoom을 호출한다', async () => {
      const client = {} as Socket
      const payload: RoomJoinPayload = {
        roomId: 'room-1',
        user: { id: 'u1', name: 'user' },
      }

      jest.spyOn(classValidator, 'validateSync').mockReturnValue([])

      await gateway.onRoomJoin(client, payload)

      expect(roomService.joinRoom).toHaveBeenCalledTimes(1)

      const calls = roomService.joinRoom.mock.calls
      const [calledClient, calledPayload] = calls[0] as [Socket, unknown]

      expect(calledClient).toBe(client)
      expect(calledPayload).toEqual(payload)
    })

    it('roomId가 문자열이 아니면 joinRoom을 호출하지 않는다', async () => {
      const client = {} as Socket
      const payload: RoomJoinPayload = {
        roomId: 'room-1',
        user: { id: 'u1', name: 'user' },
      }

      const validationError: ValidationError = {
        property: 'roomId',
        constraints: { isString: 'roomId는 문자열이어야 합니다' },
      }
      jest.spyOn(classValidator, 'validateSync').mockReturnValue([validationError])

      await gateway.onRoomJoin(client, payload)

      expect(roomService.joinRoom).not.toHaveBeenCalled()
    })

    it('roomId가 비어있으면 joinRoom을 호출하지 않는다', async () => {
      const client = {} as Socket
      const payload: RoomJoinPayload = {
        roomId: 'room-1',
        user: { id: 'u1', name: 'user' },
      }

      const validationError: ValidationError = {
        property: 'roomId',
        constraints: { isNotEmpty: 'roomId는 비어있을 수 없습니다' },
      }
      jest.spyOn(classValidator, 'validateSync').mockReturnValue([validationError])

      await gateway.onRoomJoin(client, payload)

      expect(roomService.joinRoom).not.toHaveBeenCalled()
    })

    it('roomId가 최소 길이 미만이면 joinRoom을 호출하지 않는다', async () => {
      const client = {} as Socket
      const payload: RoomJoinPayload = {
        roomId: 'room-1',
        user: { id: 'u1', name: 'user' },
      }

      const validationError: ValidationError = {
        property: 'roomId',
        constraints: { minLength: 'roomId는 최소 1자 이상이어야 합니다' },
      }
      jest.spyOn(classValidator, 'validateSync').mockReturnValue([validationError])

      await gateway.onRoomJoin(client, payload)

      expect(roomService.joinRoom).not.toHaveBeenCalled()
    })

    it('user 정보 형식이 올바르지 않으면 joinRoom을 호출하지 않는다', async () => {
      const client = {} as Socket
      const payload: RoomJoinPayload = {
        roomId: 'room-1',
        user: { id: 'u1', name: 'user' },
      }

      const validationError: ValidationError = {
        property: 'user',
        constraints: { validateNested: 'user 정보 형식이 올바르지 않습니다' },
      }
      jest.spyOn(classValidator, 'validateSync').mockReturnValue([validationError])

      await gateway.onRoomJoin(client, payload)

      expect(roomService.joinRoom).not.toHaveBeenCalled()
    })

    it('user.id가 문자열이 아니면 joinRoom을 호출하지 않는다', async () => {
      const client = {} as Socket
      const payload: RoomJoinPayload = {
        roomId: 'room-1',
        user: { id: 'u1', name: 'user' },
      }

      const validationError: ValidationError = {
        property: 'user',
        children: [
          {
            property: 'id',
            constraints: { isString: 'id는 문자열이어야 합니다' },
          },
        ],
      }
      jest.spyOn(classValidator, 'validateSync').mockReturnValue([validationError])

      await gateway.onRoomJoin(client, payload)

      expect(roomService.joinRoom).not.toHaveBeenCalled()
    })

    it('user.id가 비어있으면 joinRoom을 호출하지 않는다', async () => {
      const client = {} as Socket
      const payload: RoomJoinPayload = {
        roomId: 'room-1',
        user: { id: 'u1', name: 'user' },
      }

      const validationError: ValidationError = {
        property: 'user',
        children: [
          {
            property: 'id',
            constraints: { isNotEmpty: 'id는 비어있을 수 없습니다' },
          },
        ],
      }
      jest.spyOn(classValidator, 'validateSync').mockReturnValue([validationError])

      await gateway.onRoomJoin(client, payload)

      expect(roomService.joinRoom).not.toHaveBeenCalled()
    })

    it('user.name이 문자열이 아니면 joinRoom을 호출하지 않는다', async () => {
      const client = {} as Socket
      const payload: RoomJoinPayload = {
        roomId: 'room-1',
        user: { id: 'u1', name: 'user' },
      }

      const validationError: ValidationError = {
        property: 'user',
        children: [
          {
            property: 'name',
            constraints: { isString: 'name은 문자열이어야 합니다' },
          },
        ],
      }
      jest.spyOn(classValidator, 'validateSync').mockReturnValue([validationError])

      await gateway.onRoomJoin(client, payload)

      expect(roomService.joinRoom).not.toHaveBeenCalled()
    })

    it('user.name이 비어있으면 joinRoom을 호출하지 않는다', async () => {
      const client = {} as Socket
      const payload: RoomJoinPayload = {
        roomId: 'room-1',
        user: { id: 'u1', name: 'user' },
      }

      const validationError: ValidationError = {
        property: 'user',
        children: [
          {
            property: 'name',
            constraints: { isNotEmpty: 'name은 비어있을 수 없습니다' },
          },
        ],
      }
      jest.spyOn(classValidator, 'validateSync').mockReturnValue([validationError])

      await gateway.onRoomJoin(client, payload)

      expect(roomService.joinRoom).not.toHaveBeenCalled()
    })

    it('user.profile_image가 문자열이 아니면 joinRoom을 호출하지 않는다', async () => {
      const client = {} as Socket
      const payload: RoomJoinPayload = {
        roomId: 'room-1',
        user: { id: 'u1', name: 'user' },
      }

      const validationError: ValidationError = {
        property: 'user',
        children: [
          {
            property: 'profile_image',
            constraints: { isString: 'profile_image는 문자열이어야 합니다' },
          },
        ],
      }
      jest.spyOn(classValidator, 'validateSync').mockReturnValue([validationError])

      await gateway.onRoomJoin(client, payload)

      expect(roomService.joinRoom).not.toHaveBeenCalled()
    })
  })

  describe('onRoomLeave', () => {
    it('유효한 payload가 전달되면 RoomService.leaveRoomBySession을 호출한다', async () => {
      const client = {} as Socket
      const payload: RoomLeavePayload = { roomId: 'room-1' }

      jest.spyOn(classValidator, 'validateSync').mockReturnValue([])

      await gateway.onRoomLeave(client, payload)

      expect(roomService.leaveRoomBySession).toHaveBeenCalledTimes(1)

      const calls = roomService.leaveRoomBySession.mock.calls
      const [calledClient, calledPayload] = calls[0] as [Socket, unknown]

      expect(calledClient).toBe(client)
      expect(calledPayload).toEqual(payload)
    })

    it('roomId가 문자열이 아니면 leaveRoomBySession을 호출하지 않는다', async () => {
      const client = {} as Socket
      const payload: RoomLeavePayload = { roomId: 'room-1' }

      const validationError: ValidationError = {
        property: 'roomId',
        constraints: { isString: 'roomId는 문자열이어야 합니다' },
      }
      jest.spyOn(classValidator, 'validateSync').mockReturnValue([validationError])

      await gateway.onRoomLeave(client, payload)

      expect(roomService.leaveRoomBySession).not.toHaveBeenCalled()
    })

    it('roomId가 비어있으면 leaveRoomBySession을 호출하지 않는다', async () => {
      const client = {} as Socket
      const payload: RoomLeavePayload = { roomId: 'room-1' }

      const validationError: ValidationError = {
        property: 'roomId',
        constraints: { isNotEmpty: 'roomId는 비어있을 수 없습니다' },
      }
      jest.spyOn(classValidator, 'validateSync').mockReturnValue([validationError])

      await gateway.onRoomLeave(client, payload)

      expect(roomService.leaveRoomBySession).not.toHaveBeenCalled()
    })

    it('roomId가 최소 길이 미만이면 leaveRoomBySession을 호출하지 않는다', async () => {
      const client = {} as Socket
      const payload: RoomLeavePayload = { roomId: 'room-1' }

      const validationError: ValidationError = {
        property: 'roomId',
        constraints: { minLength: 'roomId는 최소 1자 이상이어야 합니다' },
      }
      jest.spyOn(classValidator, 'validateSync').mockReturnValue([validationError])

      await gateway.onRoomLeave(client, payload)

      expect(roomService.leaveRoomBySession).not.toHaveBeenCalled()
    })
  })
})
