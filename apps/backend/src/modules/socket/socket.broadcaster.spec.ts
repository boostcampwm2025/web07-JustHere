import type { Server, BroadcastOperator, DefaultEventsMap } from 'socket.io'

import { RoomBroadcaster } from './room.broadcaster'

type MockBroadcastOperator = BroadcastOperator<DefaultEventsMap, unknown> & {
  emit: jest.Mock
  except: jest.Mock
}

function createMockServer() {
  const mockBroadcastOperator = {
    emit: jest.fn(),
    except: jest.fn(),
  } as MockBroadcastOperator

  mockBroadcastOperator.except.mockReturnValue(mockBroadcastOperator)

  const server = {
    to: jest.fn().mockReturnValue(mockBroadcastOperator),
  } as Server & { to: jest.Mock }

  return { server, mockBroadcastOperator }
}

describe('SocketBroadcaster', () => {
  let broadcaster: RoomBroadcaster

  beforeEach(() => {
    broadcaster = new RoomBroadcaster()
  })

  describe('emitToRoom', () => {
    it('서버가 설정되지 않은 경우 아무 동작도 하지 않는다', () => {
      const { server } = createMockServer()

      broadcaster.emitToRoom('room-1', 'test-event', { data: 'test' })

      expect(server.to).not.toHaveBeenCalled()
    })

    it('방에 이벤트를 브로드캐스트한다', () => {
      const { server, mockBroadcastOperator } = createMockServer()
      broadcaster.setServer(server)

      const payload = { message: 'hello' }
      broadcaster.emitToRoom('room-1', 'chat:message', payload)

      expect(server.to).toHaveBeenCalledWith('room:room-1')
      expect(mockBroadcastOperator.emit).toHaveBeenCalledWith('chat:message', payload)
    })

    it('exceptSocketId가 지정된 경우 해당 소켓을 제외하고 브로드캐스트한다', () => {
      const { server, mockBroadcastOperator } = createMockServer()
      broadcaster.setServer(server)

      const payload = { userId: 'user-1' }
      broadcaster.emitToRoom('room-1', 'user:joined', payload, {
        exceptSocketId: 'socket-123',
      })

      expect(server.to).toHaveBeenCalledWith('room:room-1')
      expect(mockBroadcastOperator.except).toHaveBeenCalledWith('socket-123')
      expect(mockBroadcastOperator.emit).toHaveBeenCalledWith('user:joined', payload)
    })

    it('exceptSocketId가 undefined인 경우 모든 소켓에 브로드캐스트한다', () => {
      const { server, mockBroadcastOperator } = createMockServer()
      broadcaster.setServer(server)

      const payload = { data: 'test' }
      broadcaster.emitToRoom('room-1', 'test-event', payload, {
        exceptSocketId: undefined,
      })

      expect(server.to).toHaveBeenCalledWith('room:room-1')
      expect(mockBroadcastOperator.except).not.toHaveBeenCalled()
      expect(mockBroadcastOperator.emit).toHaveBeenCalledWith('test-event', payload)
    })

    it('제네릭 타입의 페이로드를 올바르게 전달한다', () => {
      const { server, mockBroadcastOperator } = createMockServer()
      broadcaster.setServer(server)

      interface CustomPayload {
        id: number
        name: string
        nested: { value: boolean }
      }

      const payload: CustomPayload = {
        id: 1,
        name: 'test',
        nested: { value: true },
      }

      broadcaster.emitToRoom<CustomPayload>('room-1', 'custom:event', payload)

      expect(mockBroadcastOperator.emit).toHaveBeenCalledWith('custom:event', payload)
    })
  })
})
