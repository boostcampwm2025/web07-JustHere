import { Test, TestingModule } from '@nestjs/testing';
import type { Socket } from 'socket.io';
import type { Category } from '@prisma/client';

import { RoomService } from './room.service';
import { CategoryRepository } from '@/category/category.repository';
import { SocketBroadcaster } from '@/socket/socket.broadcaster';
import { UserService } from '@/user/user.service';
import type { UserSession, MoveCategoryResult } from '@/user/user.type';
import type { RoomJoinPayload, RoomLeavePayload } from './dto/room.c2s.dto';
import {
  RoomCategoryChangedPayload,
  RoomUserJoinedPayload,
  RoomUserLeftPayload,
  RoomUserMovedPayload,
} from './dto/room.s2c.dto';

jest.mock('class-transformer', () => ({
  plainToInstance: <T>(_cls: unknown, obj: T) => obj,
  Transform: () => () => undefined,
  Type: () => () => undefined,
}));

function createMockSocket(id = 'socket-1') {
  return {
    id,
    join: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
    emit: jest.fn(),
  } as Socket & {
    join: jest.Mock;
    leave: jest.Mock;
    emit: jest.Mock;
  };
}

describe('RoomService', () => {
  let service: RoomService;

  const roomId = 'room-1';
  const now = new Date();

  const sessionA: UserSession = {
    socketId: 'socket-1',
    userId: 'user-1',
    nickname: 'ajin',
    roomId,
    color: 'red',
    categoryId: null,
    joinedAt: now,
  };

  const sessionB: UserSession = {
    socketId: 'socket-2',
    userId: 'user-2',
    nickname: 'kim',
    roomId,
    color: 'blue',
    categoryId: 'cat-1',
    joinedAt: now,
  };

  const users = {
    getSession: jest.fn(),
    createSession: jest.fn(),
    removeSession: jest.fn(),
    getSessionsByRoom: jest.fn(),
    moveCategory: jest.fn(),
  };

  const categories = {
    findByRoomId: jest.fn(),
  };

  const broadcaster = {
    emitToRoom: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomService,
        { provide: UserService, useValue: users },
        { provide: CategoryRepository, useValue: categories },
        { provide: SocketBroadcaster, useValue: broadcaster },
      ],
    }).compile();

    service = module.get(RoomService);
  });

  describe('joinRoom', () => {
    it('기존 세션이 없으면: join -> state emit(본인) -> user_joined broadcast(타인) 순으로 처리', async () => {
      const client = createMockSocket('socket-1');

      const mockCategory: Category = {
        id: 'cat-1',
        roomId,
        title: '카테고리1',
        orderIndex: 0,
        createdAt: now,
      };

      users.getSession.mockReturnValue(null);
      users.createSession.mockReturnValue(sessionA);
      users.getSessionsByRoom.mockReturnValue([sessionA, sessionB]);
      categories.findByRoomId.mockResolvedValue([mockCategory]);

      const payload: RoomJoinPayload = {
        roomId,
        user: { id: 'user-1', name: 'ajin', profile_image: undefined },
      };

      await service.joinRoom(client, payload);

      expect(client.join).toHaveBeenCalledWith(`room:${roomId}`);

      // 본인에게 room:state
      const emitCalls = client.emit.mock.calls;
      expect(emitCalls.length).toBe(1);

      const [emitEvent, emitPayload] = emitCalls[0] as [string, unknown];
      expect(emitEvent).toBe('room:state');

      const statePayload = emitPayload as {
        participants: unknown[];
        categories: Category[];
      };
      expect(Array.isArray(statePayload.participants)).toBe(true);
      expect(statePayload.categories).toEqual([mockCategory]);

      const calls = broadcaster.emitToRoom.mock.calls;
      expect(calls.length).toBe(1);

      const [calledRoomId, event, payloadArg, options] = calls[0] as [
        string,
        string,
        RoomUserJoinedPayload,
        string,
      ];

      expect(calledRoomId).toBe(roomId);
      expect(event).toBe('room:user_joined');
      expect(options).toEqual({ exceptSocketId: 'socket-1' });

      const participant = payloadArg.participant;
      expect(participant.socketId).toBe('socket-1');
      expect(participant.userId).toBe('user-1');
      expect(participant.nickname).toBe('ajin');
    });

    it('기존 세션이 있으면: leaveRoom 수행 후 새 방 join 처리', async () => {
      const client = createMockSocket('socket-1');

      // 기존 세션 존재
      users.getSession.mockReturnValue(sessionA);
      users.createSession.mockReturnValue(sessionA);
      users.getSessionsByRoom.mockReturnValue([sessionA]);
      categories.findByRoomId.mockResolvedValue([]);

      const payload: RoomJoinPayload = {
        roomId,
        user: { id: 'user-1', name: 'ajin', profile_image: undefined },
      };

      await service.joinRoom(client, payload);

      // 기존 방 leave 호출됨
      expect(client.leave).toHaveBeenCalledWith(`room:${roomId}`);

      // joinRoom 안에서 (1) user_left, (2) user_joined 총 2번 호출됨
      const calls = broadcaster.emitToRoom.mock.calls;
      expect(calls.length).toBe(2);

      const [leftRoomId, leftEvent, leftPayload] = calls[0] as [
        string,
        string,
        RoomUserLeftPayload,
      ];
      expect(leftRoomId).toBe(roomId);
      expect(leftEvent).toBe('room:user_left');

      expect(leftPayload.participant.socketId).toBe('socket-1');

      expect(users.removeSession).toHaveBeenCalledWith('socket-1');

      // 새 방 join 호출됨
      expect(client.join).toHaveBeenCalledWith(`room:${roomId}`);

      // 두 번째 호출: user_joined
      const [joinedRoomId, joinedEvent, joinedPayload, joinedOptions] =
        calls[1] as [string, string, RoomUserJoinedPayload, string];

      expect(joinedRoomId).toBe(roomId);
      expect(joinedEvent).toBe('room:user_joined');
      expect(joinedOptions).toEqual({ exceptSocketId: 'socket-1' });

      const joinedParticipant = joinedPayload.participant;
      expect(joinedParticipant.socketId).toBe('socket-1');
    });
  });

  describe('leaveRoomBySession', () => {
    it('세션이 없으면 아무것도 하지 않음', async () => {
      const client = createMockSocket('socket-1');
      users.getSession.mockReturnValue(null);

      const payload: RoomLeavePayload = { roomId };

      await service.leaveRoomBySession(client, payload);

      expect(client.leave).not.toHaveBeenCalled();
      expect(users.removeSession).not.toHaveBeenCalled();
      expect(broadcaster.emitToRoom).not.toHaveBeenCalled();
    });

    it('payload.roomId와 session.roomId가 다르면 아무것도 하지 않음', async () => {
      const client = createMockSocket('socket-1');
      users.getSession.mockReturnValue({ ...sessionA, roomId: 'room-A' });

      await service.leaveRoomBySession(client, { roomId: 'room-B' });

      expect(client.leave).not.toHaveBeenCalled();
      expect(users.removeSession).not.toHaveBeenCalled();
      expect(broadcaster.emitToRoom).not.toHaveBeenCalled();
    });

    it('roomId가 일치하면 leaveRoom 실행', async () => {
      const client = createMockSocket('socket-1');
      users.getSession.mockReturnValue(sessionA);

      await service.leaveRoomBySession(client, { roomId });

      expect(client.leave).toHaveBeenCalledWith(`room:${roomId}`);

      const calls = broadcaster.emitToRoom.mock.calls;
      expect(calls.length).toBe(1);

      const [calledRoomId, event, payloadArg] = calls[0] as [
        string,
        string,
        RoomUserLeftPayload,
      ];
      expect(calledRoomId).toBe(roomId);
      expect(event).toBe('room:user_left');

      expect(payloadArg.participant.socketId).toBe('socket-1');

      expect(users.removeSession).toHaveBeenCalledWith('socket-1');
    });
  });

  describe('leaveByDisconnect', () => {
    it('disconnect 시에도 leaveRoom 수행', async () => {
      const client = createMockSocket('socket-1');
      users.getSession.mockReturnValue(sessionA);

      await service.leaveByDisconnect(client);

      expect(client.leave).toHaveBeenCalledWith(`room:${roomId}`);
      expect(users.removeSession).toHaveBeenCalledWith('socket-1');

      const calls = broadcaster.emitToRoom.mock.calls;
      expect(calls.length).toBe(1);

      const [calledRoomId, event] = calls[0] as [string, string];
      expect(calledRoomId).toBe(roomId);
      expect(event).toBe('room:user_left');
    });
  });

  describe('getUsersByRoom', () => {
    it('룸 세션들을 Participant 배열로 매핑해서 반환', () => {
      users.getSessionsByRoom.mockReturnValue([sessionA, sessionB]);

      const participants = service.getUsersByRoom(roomId);

      expect(participants).toHaveLength(2);

      expect(participants[0].userId).toBe('user-1');
      expect(participants[1].userId).toBe('user-2');
    });
  });

  describe('broadcastUserMoved', () => {
    it('moveCategory가 실패하면 브로드캐스트 하지 않음', () => {
      users.moveCategory.mockReturnValue(null);

      service.broadcastUserMoved('socket-1', null, 'cat-1');

      expect(broadcaster.emitToRoom).not.toHaveBeenCalled();
    });

    it('moveCategory가 성공하면 room:user_moved 브로드캐스트', () => {
      const moveResult: MoveCategoryResult = {
        session: sessionA,
        from: null,
        to: 'cat-1',
      };
      users.moveCategory.mockReturnValue(moveResult);

      service.broadcastUserMoved('socket-1', null, 'cat-1');

      const calls = broadcaster.emitToRoom.mock.calls;
      expect(calls.length).toBe(1);

      const [calledRoomId, event, payloadArg] = calls[0] as [
        string,
        string,
        RoomUserMovedPayload,
      ];

      expect(calledRoomId).toBe(roomId);
      expect(event).toBe('room:user_moved');

      expect(payloadArg.participant.socketId).toBe('socket-1');
      expect(payloadArg.fromCategoryId).toBeNull();
      expect(payloadArg.toCategoryId).toBe('cat-1');
    });
  });

  describe('broadcastCategoryChanged', () => {
    it('room:category_changed 브로드캐스트', () => {
      const category: Category = {
        id: 'cat-1',
        roomId,
        title: '카테고리1',
        orderIndex: 0,
        createdAt: now,
      };

      service.broadcastCategoryChanged(roomId, 'updated', category);

      const calls = broadcaster.emitToRoom.mock.calls;
      expect(calls.length).toBe(1);

      const [calledRoomId, event, payloadArg] = calls[0] as [
        string,
        string,
        RoomCategoryChangedPayload,
      ];

      expect(calledRoomId).toBe(roomId);
      expect(event).toBe('room:category_changed');

      expect(payloadArg.action).toBe('updated');
      expect(payloadArg.category).toBe(category);
    });
  });
});
