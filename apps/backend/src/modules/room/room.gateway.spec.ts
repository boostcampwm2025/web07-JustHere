import { Test, TestingModule } from '@nestjs/testing'
import type { Server, Socket } from 'socket.io'
import type { ValidationError } from 'class-validator'
import * as classValidator from 'class-validator'

import { RoomGateway } from './room.gateway'
import { RoomService } from './room.service'
import { RoomBroadcaster } from '@/modules/socket/room.broadcaster'
import { RoomJoinPayload, ParticipantUpdateNamePayload, RoomTransferOwnerPayload } from './dto/room.c2s.dto'

describe('RoomGateway', () => {
  let gateway: RoomGateway

  const roomService = {
    leaveByDisconnect: jest.fn(),
    joinRoom: jest.fn(),
    leaveRoomBySession: jest.fn(),
    updateParticipantName: jest.fn(),
    transferOwner: jest.fn(),
  }

  const broadcaster = {
    setServer: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomGateway, { provide: RoomService, useValue: roomService }, { provide: RoomBroadcaster, useValue: broadcaster }],
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
        user: { userId: 'u1', name: 'user' },
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
        user: { userId: 'u1', name: 'user' },
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
        user: { userId: 'u1', name: 'user' },
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
        user: { userId: 'u1', name: 'user' },
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
        user: { userId: 'u1', name: 'user' },
      }

      const validationError: ValidationError = {
        property: 'user',
        constraints: { validateNested: 'user 정보 형식이 올바르지 않습니다' },
      }
      jest.spyOn(classValidator, 'validateSync').mockReturnValue([validationError])

      await gateway.onRoomJoin(client, payload)

      expect(roomService.joinRoom).not.toHaveBeenCalled()
    })

    it('user.userId가 문자열이 아니면 joinRoom을 호출하지 않는다', async () => {
      const client = {} as Socket
      const payload: RoomJoinPayload = {
        roomId: 'room-1',
        user: { userId: 'u1', name: 'user' },
      }

      const validationError: ValidationError = {
        property: 'user',
        children: [
          {
            property: 'userId',
            constraints: { isString: 'userId는 문자열이어야 합니다' },
          },
        ],
      }
      jest.spyOn(classValidator, 'validateSync').mockReturnValue([validationError])

      await gateway.onRoomJoin(client, payload)

      expect(roomService.joinRoom).not.toHaveBeenCalled()
    })

    it('user.userId가 비어있으면 joinRoom을 호출하지 않는다', async () => {
      const client = {} as Socket
      const payload: RoomJoinPayload = {
        roomId: 'room-1',
        user: { userId: 'u1', name: 'user' },
      }

      const validationError: ValidationError = {
        property: 'user',
        children: [
          {
            property: 'userId',
            constraints: { isNotEmpty: 'userId는 비어있을 수 없습니다' },
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
        user: { userId: 'u1', name: 'user' },
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
        user: { userId: 'u1', name: 'user' },
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
  })

  describe('onRoomLeave', () => {
    it('RoomService.leaveRoomBySession을 호출한다', async () => {
      const client = {} as Socket

      await gateway.onRoomLeave(client)

      expect(roomService.leaveRoomBySession).toHaveBeenCalledTimes(1)

      const calls = roomService.leaveRoomBySession.mock.calls
      const [calledClient] = calls[0] as [Socket]

      expect(calledClient).toBe(client)
    })
  })

  describe('onUpdateName', () => {
    it('유효한 payload가 전달되면 RoomService.updateParticipantName을 호출한다', () => {
      const client = {} as Socket
      const payload: ParticipantUpdateNamePayload = { name: 'newName' }

      jest.spyOn(classValidator, 'validateSync').mockReturnValue([])

      gateway.onUpdateName(client, payload)

      expect(roomService.updateParticipantName).toHaveBeenCalledTimes(1)
      expect(roomService.updateParticipantName).toHaveBeenCalledWith(client, 'newName')
    })

    it('name이 비어있으면 updateParticipantName을 호출하지 않는다', () => {
      const client = {} as Socket
      const payload: ParticipantUpdateNamePayload = { name: '' }

      const validationError: ValidationError = {
        property: 'name',
        constraints: { isNotEmpty: 'name은 비어있을 수 없습니다' },
      }
      jest.spyOn(classValidator, 'validateSync').mockReturnValue([validationError])

      gateway.onUpdateName(client, payload)

      expect(roomService.updateParticipantName).not.toHaveBeenCalled()
    })

    it('name이 20자를 초과하면 updateParticipantName을 호출하지 않는다', () => {
      const client = {} as Socket
      const payload: ParticipantUpdateNamePayload = { name: 'a'.repeat(21) }

      const validationError: ValidationError = {
        property: 'name',
        constraints: { maxLength: 'name은 최대 20자 이하여야 합니다' },
      }
      jest.spyOn(classValidator, 'validateSync').mockReturnValue([validationError])

      gateway.onUpdateName(client, payload)

      expect(roomService.updateParticipantName).not.toHaveBeenCalled()
    })
  })

  describe('onTransferOwner', () => {
    it('유효한 payload가 전달되면 RoomService.transferOwner를 호출한다', () => {
      const client = {} as Socket
      const payload: RoomTransferOwnerPayload = { targetUserId: 'user-2' }

      jest.spyOn(classValidator, 'validateSync').mockReturnValue([])

      gateway.onTransferOwner(client, payload)

      expect(roomService.transferOwner).toHaveBeenCalledTimes(1)
      expect(roomService.transferOwner).toHaveBeenCalledWith(client, 'user-2')
    })

    it('targetUserId가 비어있으면 transferOwner를 호출하지 않는다', () => {
      const client = {} as Socket
      const payload: RoomTransferOwnerPayload = { targetUserId: '' }

      const validationError: ValidationError = {
        property: 'targetUserId',
        constraints: { isNotEmpty: 'targetUserId는 비어있을 수 없습니다' },
      }
      jest.spyOn(classValidator, 'validateSync').mockReturnValue([validationError])

      gateway.onTransferOwner(client, payload)

      expect(roomService.transferOwner).not.toHaveBeenCalled()
    })
  })
})
