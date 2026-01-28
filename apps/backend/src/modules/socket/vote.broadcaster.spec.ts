import type { Server, BroadcastOperator, DefaultEventsMap } from 'socket.io'
import { VoteBroadcaster } from './vote.broadcaster'

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

describe('VoteBroadcaster', () => {
  let broadcaster: VoteBroadcaster

  beforeEach(() => {
    broadcaster = new VoteBroadcaster()
  })

  describe('emitToVote', () => {
    it('서버가 설정되지 않은 경우 아무 동작도 하지 않는다', () => {
      const { server } = createMockServer()
      // setServer를 호출하지 않음

      broadcaster.emitToVote('vote-room-1', 'vote:started', {})

      expect(server.to).not.toHaveBeenCalled()
    })

    it('투표 방에 이벤트를 브로드캐스트한다', () => {
      const { server, mockBroadcastOperator } = createMockServer()
      broadcaster.setServer(server)

      const payload = { candidateId: 'c1' }
      broadcaster.emitToVote('vote-room-1', 'vote:cast', payload)

      expect(server.to).toHaveBeenCalledWith('vote:vote-room-1')
      expect(mockBroadcastOperator.emit).toHaveBeenCalledWith('vote:cast', payload)
    })

    it('exceptSocketId가 지정된 경우 해당 소켓을 제외하고 브로드캐스트한다', () => {
      const { server, mockBroadcastOperator } = createMockServer()
      broadcaster.setServer(server)

      const payload = { candidateId: 'c2' }
      broadcaster.emitToVote('vote-room-1', 'vote:revoked', payload, {
        exceptSocketId: 'socket-456',
      })

      expect(server.to).toHaveBeenCalledWith('vote:vote-room-1')
      expect(mockBroadcastOperator.except).toHaveBeenCalledWith('socket-456')
      expect(mockBroadcastOperator.emit).toHaveBeenCalledWith('vote:revoked', payload)
    })
  })
})
