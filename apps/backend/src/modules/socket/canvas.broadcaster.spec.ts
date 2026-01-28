import { Server } from 'socket.io'
import { CanvasBroadcaster } from './canvas.broadcaster'

describe('CanvasBroadcaster', () => {
  let broadcaster: CanvasBroadcaster

  // 1. Socket.io의 체이닝을 처리할 Mock 객체 타입 정의
  let mockBroadcastOperator: {
    emit: jest.Mock
    except: jest.Mock
  }

  let mockServer: {
    to: jest.Mock
  }

  beforeEach(() => {
    broadcaster = new CanvasBroadcaster()

    // 2. BroadcastOperator Mock 초기화
    mockBroadcastOperator = {
      emit: jest.fn(),
      except: jest.fn(),
    }
    // 체이닝 지원: .except() 호출 시 다시 operator 반환
    mockBroadcastOperator.except.mockReturnValue(mockBroadcastOperator)

    // 3. Server Mock 초기화
    mockServer = {
      // .to() 호출 시 operator 반환
      to: jest.fn().mockReturnValue(mockBroadcastOperator),
    }
  })

  describe('emitToCanvas', () => {
    it('서버가 설정되지 않은 경우 아무 동작도 하지 않는다', () => {
      // setServer를 호출하지 않은 상태

      broadcaster.emitToCanvas('canvas-1', 'draw:line', {})

      // mockServer가 호출되지 않았음을 검증
      expect(mockServer.to).not.toHaveBeenCalled()
    })

    it('캔버스 방에 이벤트를 브로드캐스트한다', () => {
      // 타입 호환성을 위해 unknown을 거쳐 Server로 단언하여 주입
      broadcaster.setServer(mockServer as unknown as Server)

      const payload = { x: 10, y: 20 }
      broadcaster.emitToCanvas('canvas-1', 'draw:point', payload)

      expect(mockServer.to).toHaveBeenCalledWith('canvas:canvas-1')
      expect(mockBroadcastOperator.emit).toHaveBeenCalledWith('draw:point', payload)
    })

    it('exceptSocketId가 지정된 경우 해당 소켓을 제외하고 브로드캐스트한다', () => {
      broadcaster.setServer(mockServer as unknown as Server)

      const payload = { objectId: 'obj-1' }
      broadcaster.emitToCanvas('canvas-1', 'object:removed', payload, {
        exceptSocketId: 'socket-789',
      })

      expect(mockServer.to).toHaveBeenCalledWith('canvas:canvas-1')
      // 체이닝 메서드 호출 검증
      expect(mockBroadcastOperator.except).toHaveBeenCalledWith('socket-789')
      expect(mockBroadcastOperator.emit).toHaveBeenCalledWith('object:removed', payload)
    })
  })
})
