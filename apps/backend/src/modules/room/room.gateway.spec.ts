import { RoomActivitySchedulerService } from '@/modules/room/room-activity-scheduler.service'
import { Test, TestingModule } from '@nestjs/testing'
import type { Server, Socket } from 'socket.io'
import { RoomGateway } from './room.gateway'
import { RoomService } from './room.service'
import { RoomBroadcaster } from '@/modules/socket/room.broadcaster'
import { RoomJoinPayload, ParticipantUpdateNamePayload, RoomTransferOwnerPayload } from './dto/room.c2s.dto'

describe('RoomGateway', () => {
  let gateway: RoomGateway

  const roomService = {
    leaveRoom: jest.fn(),
    joinRoom: jest.fn(),
    updateParticipantName: jest.fn(),
    transferOwner: jest.fn(),
  }

  const broadcaster = {
    setServer: jest.fn(),
  }

  const roomScheduler = {
    markAsActive: jest.fn(),
    flushActivityToDb: jest.fn(),
    cleanUpGhostRooms: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomGateway,
        { provide: RoomService, useValue: roomService },
        { provide: RoomBroadcaster, useValue: broadcaster },
        { provide: RoomActivitySchedulerService, useValue: roomScheduler },
      ],
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

      expect(roomService.leaveRoom).toHaveBeenCalledTimes(1)
      expect(roomService.leaveRoom).toHaveBeenCalledWith(client)
    })
  })

  describe('onRoomJoin', () => {
    it('RoomService.joinRoom을 올바른 인자와 함께 호출한다', async () => {
      const client = {} as Socket
      const payload: RoomJoinPayload = {
        roomId: 'room-1',
        user: { userId: 'u1', name: 'user' },
      }

      await gateway.onRoomJoin(client, payload)

      expect(roomService.joinRoom).toHaveBeenCalledTimes(1)
      expect(roomService.joinRoom).toHaveBeenCalledWith(client, payload)
    })
  })

  describe('onRoomLeave', () => {
    it('RoomService.leaveRoomBySession을 호출한다', async () => {
      const client = {} as Socket

      await gateway.onRoomLeave(client)

      expect(roomService.leaveRoom).toHaveBeenCalledTimes(1)
      expect(roomService.leaveRoom).toHaveBeenCalledWith(client)
    })
  })

  describe('onUpdateName', () => {
    it('RoomService.updateParticipantName을 올바른 인자와 함께 호출한다', () => {
      const client = {} as Socket
      const payload: ParticipantUpdateNamePayload = { name: 'newName' }

      gateway.onUpdateName(client, payload)

      expect(roomService.updateParticipantName).toHaveBeenCalledTimes(1)
      expect(roomService.updateParticipantName).toHaveBeenCalledWith(client, payload.name)
    })
  })

  describe('onTransferOwner', () => {
    it('RoomService.transferOwner를 올바른 인자와 함께 호출한다', () => {
      const client = {} as Socket
      const payload: RoomTransferOwnerPayload = { targetUserId: 'user-2' }

      gateway.onTransferOwner(client, payload)

      expect(roomService.transferOwner).toHaveBeenCalledTimes(1)
      expect(roomService.transferOwner).toHaveBeenCalledWith(client, payload.targetUserId)
    })
  })
})
