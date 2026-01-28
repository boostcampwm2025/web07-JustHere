import type { Server, BroadcastOperator, DefaultEventsMap } from 'socket.io'
import { CanvasBroadcaster } from './canvas.broadcaster'

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

describe('CanvasBroadcaster', () => {
  let broadcaster: CanvasBroadcaster

  beforeEach(() => {
    broadcaster = new CanvasBroadcaster()
  })

  describe('emitToCanvas', () => {
    it('서버가 설정되지 않은 경우 아무 동작도 하지 않는다', () => {
      const { server } = createMockServer()
      // setServer를 호출하지 않음

      broadcaster.emitToCanvas('canvas-1', 'draw:line', {})

      expect(server.to).not.toHaveBeenCalled()
    })

    it('캔버스 방에 이벤트를 브로드캐스트한다', () => {
      const { server, mockBroadcastOperator } = createMockServer()
      broadcaster.setServer(server)

      const payload = { x: 10, y: 20 }
      broadcaster.emitToCanvas('canvas-1', 'draw:point', payload)

      expect(server.to).toHaveBeenCalledWith('canvas:canvas-1')
      expect(mockBroadcastOperator.emit).toHaveBeenCalledWith('draw:point', payload)
    })

    it('exceptSocketId가 지정된 경우 해당 소켓을 제외하고 브로드캐스트한다', () => {
      const { server, mockBroadcastOperator } = createMockServer()
      broadcaster.setServer(server)

      const payload = { objectId: 'obj-1' }
      broadcaster.emitToCanvas('canvas-1', 'object:removed', payload, {
        exceptSocketId: 'socket-789',
      })

      expect(server.to).toHaveBeenCalledWith('canvas:canvas-1')
      expect(mockBroadcastOperator.except).toHaveBeenCalledWith('socket-789')
      expect(mockBroadcastOperator.emit).toHaveBeenCalledWith('object:removed', payload)
    })
  })
})
