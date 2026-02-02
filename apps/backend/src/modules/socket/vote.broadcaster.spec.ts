import { Server } from 'socket.io'
import { VoteBroadcaster } from './vote.broadcaster'

describe('VoteBroadcaster', () => {
  let broadcaster: VoteBroadcaster

  // 1. Socket.io의 체이닝을 처리할 Mock 객체 타입 정의
  let mockBroadcastOperator: {
    emit: jest.Mock
    except: jest.Mock
  }

  let mockServer: {
    to: jest.Mock
  }

  beforeEach(() => {
    broadcaster = new VoteBroadcaster()

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

  describe('emitToVote', () => {
    it('서버가 설정되지 않은 경우 아무 동작도 하지 않는다', () => {
      // setServer를 호출하지 않음
      broadcaster.emitToVote('vote-room-1', 'vote:started', {})

      expect(mockServer.to).not.toHaveBeenCalled()
    })

    it('투표 방에 이벤트를 브로드캐스트한다', () => {
      // 타입 호환성을 위해 unknown을 거쳐 Server로 단언하여 주입
      broadcaster.setServer(mockServer as unknown as Server)

      const payload = { candidateId: 'c1' }
      broadcaster.emitToVote('vote-room-1', 'vote:cast', payload)

      expect(mockServer.to).toHaveBeenCalledWith('vote:vote-room-1')
      expect(mockBroadcastOperator.emit).toHaveBeenCalledWith('vote:cast', payload)
    })

    it('exceptSocketId가 지정된 경우 해당 소켓을 제외하고 브로드캐스트한다', () => {
      broadcaster.setServer(mockServer as unknown as Server)

      const payload = { candidateId: 'c2' }
      broadcaster.emitToVote('vote-room-1', 'vote:revoked', payload, {
        exceptSocketId: 'socket-456',
      })

      expect(mockServer.to).toHaveBeenCalledWith('vote:vote-room-1')
      // 체이닝 메서드 호출 검증
      expect(mockBroadcastOperator.except).toHaveBeenCalledWith('socket-456')
      expect(mockBroadcastOperator.emit).toHaveBeenCalledWith('vote:revoked', payload)
    })
  })
})
