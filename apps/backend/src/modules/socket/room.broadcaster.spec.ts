import { Server } from 'socket.io'
import { RoomBroadcaster } from './room.broadcaster'

describe('RoomBroadcaster', () => {
  let broadcaster: RoomBroadcaster

  // 1. Socket.io의 체이닝을 처리할 Mock 객체 타입 정의
  let mockBroadcastOperator: {
    emit: jest.Mock
    except: jest.Mock
  }

  let mockServer: {
    to: jest.Mock
  }

  beforeEach(() => {
    broadcaster = new RoomBroadcaster()

    // 2. BroadcastOperator Mock 초기화
    mockBroadcastOperator = {
      emit: jest.fn(),
      except: jest.fn(),
    }
    // 체이닝 지원: .except() 호출 시 자기 자신(operator) 반환
    mockBroadcastOperator.except.mockReturnValue(mockBroadcastOperator)

    // 3. Server Mock 초기화
    mockServer = {
      // .to() 호출 시 operator 반환
      to: jest.fn().mockReturnValue(mockBroadcastOperator),
    }
  })

  describe('emitToRoom', () => {
    it('서버가 설정되지 않은 경우 아무 동작도 하지 않는다', () => {
      // setServer를 호출하지 않음
      broadcaster.emitToRoom('room-1', 'test-event', { data: 'test' })

      expect(mockServer.to).not.toHaveBeenCalled()
    })

    it('방에 이벤트를 브로드캐스트한다', () => {
      // 타입 호환성을 위해 unknown을 거쳐 Server로 단언하여 주입
      broadcaster.setServer(mockServer as unknown as Server)

      const payload = { message: 'hello' }
      broadcaster.emitToRoom('room-1', 'chat:message', payload)

      expect(mockServer.to).toHaveBeenCalledWith('room:room-1')
      expect(mockBroadcastOperator.emit).toHaveBeenCalledWith('chat:message', payload)
    })

    it('exceptSocketId가 지정된 경우 해당 소켓을 제외하고 브로드캐스트한다', () => {
      broadcaster.setServer(mockServer as unknown as Server)

      const payload = { userId: 'user-1' }
      broadcaster.emitToRoom('room-1', 'user:joined', payload, {
        exceptSocketId: 'socket-123',
      })

      expect(mockServer.to).toHaveBeenCalledWith('room:room-1')
      // 체이닝 메서드 호출 검증
      expect(mockBroadcastOperator.except).toHaveBeenCalledWith('socket-123')
      expect(mockBroadcastOperator.emit).toHaveBeenCalledWith('user:joined', payload)
    })
  })
})
