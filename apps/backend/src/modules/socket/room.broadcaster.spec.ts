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
  } as unknown as Server

  return { server, mockBroadcastOperator }
}

describe('RoomBroadcaster', () => {
  let broadcaster: RoomBroadcaster

  beforeEach(() => {
    broadcaster = new RoomBroadcaster()
  })

  describe('emitToRoom', () => {
    it('서버가 설정되지 않은 경우 아무 동작도 하지 않는다', () => {
      const { server } = createMockServer()
      // setServer를 호출하지 않음

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
  })
})
