import { Test, TestingModule } from '@nestjs/testing'
import type { Server, Socket } from 'socket.io'
import { VoteGateway } from './vote.gateway'
import { VoteService } from './vote.service'
import { VoteBroadcaster } from '@/modules/socket/vote.broadcaster'
import { UserService } from '@/modules/user/user.service'
import {
  VoteJoinPayload,
  VoteLeavePayload,
  VoteCandidateAddPayload,
  VoteCandidateRemovePayload,
  VoteCastPayload,
  VoteRevokePayload,
  VoteStartPayload,
  VoteEndPayload,
} from './dto/vote.c2s.dto'

describe('VoteGateway', () => {
  let gateway: VoteGateway

  const voteService = {
    getOrCreateSession: jest.fn(),
    addCandidatePlace: jest.fn(),
    removeCandidatePlace: jest.fn(),
    castVote: jest.fn(),
    revokeVote: jest.fn(),
    startVote: jest.fn(),
    endVote: jest.fn(),
    deleteSession: jest.fn(),
    getMyVotes: jest.fn(),
  }

  const broadcaster = {
    setServer: jest.fn(),
    emitToVote: jest.fn(),
  }

  const userService = {
    getSession: jest.fn(),
    removeSession: jest.fn(),
    getSessionByUserIdInRoom: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoteGateway,
        { provide: VoteService, useValue: voteService },
        { provide: VoteBroadcaster, useValue: broadcaster },
        { provide: UserService, useValue: userService },
      ],
    }).compile()

    gateway = module.get(VoteGateway)
  })

  describe('afterInit', () => {
    it('Gateway 초기화 시 VoteBroadcaster에 서버를 주입한다', () => {
      const server = {} as Server

      gateway.afterInit(server)

      expect(broadcaster.setServer).toHaveBeenCalledTimes(1)
      expect(broadcaster.setServer).toHaveBeenCalledWith(server)
    })
  })

  describe('handleDisconnect', () => {
    it('네임스페이스가 없으면 아무것도 하지 않는다', async () => {
      const leaveMock = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined)
      const client = {
        rooms: new Set(['vote:room-1', 'vote:room-2']),
        leave: ((room: string) => leaveMock(room)) as (room: string) => Promise<void>,
        id: 'socket-1',
      } as unknown as Socket

      await gateway.handleDisconnect(client)
      expect(leaveMock).not.toHaveBeenCalled()
    })

    it('사용자 세션이 있으면 모든 투표 방에서 나간다', async () => {
      const leaveMock = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined)
      const fetchSocketsMock = jest.fn<Promise<Socket[]>, []>().mockResolvedValue([])
      const inMock = jest.fn().mockReturnValue({ fetchSockets: fetchSocketsMock })
      const client = {
        rooms: new Set(['vote:room-1', 'vote:room-2', 'other:room']),
        leave: ((room: string) => leaveMock(room)) as (room: string) => Promise<void>,
        id: 'socket-1',
        nsp: undefined,
      } as unknown as Socket
      gateway.server = { in: inMock } as unknown as Server

      await gateway.handleDisconnect(client)
      expect(leaveMock).toHaveBeenCalledTimes(2)
      expect(leaveMock).toHaveBeenCalledWith('vote:room-1')
      expect(leaveMock).toHaveBeenCalledWith('vote:room-2')
      expect(inMock).toHaveBeenCalledTimes(2)
      expect(inMock).toHaveBeenCalledWith('vote:room-1')
      expect(inMock).toHaveBeenCalledWith('vote:room-2')
      expect(fetchSocketsMock).toHaveBeenCalledTimes(2)
      expect(voteService.deleteSession).toHaveBeenCalledTimes(2)
      expect(voteService.deleteSession).toHaveBeenCalledWith('room-1')
      expect(voteService.deleteSession).toHaveBeenCalledWith('room-2')
    })
  })

  describe('onVoteJoin', () => {
    it('클라이언트를 투표 룸에 조인하고 세션 상태를 반환한다', async () => {
      const joinMock = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined)
      const emitMock = jest.fn<boolean, [string, ...unknown[]]>()
      const client = {
        join: ((room: string) => joinMock(room)) as (room: string) => Promise<void>,
        emit: ((event: string, ...args: unknown[]) => emitMock(event, ...args)) as (event: string, ...args: unknown[]) => boolean,
        id: 'socket-1',
      } as unknown as Socket
      const payload: VoteJoinPayload = {
        roomId: 'room-1',
      }
      const mockUser = {
        userId: 'user-1',
        name: 'user',
        socketId: 'socket-1',
        roomId: 'room-1',
        isOwner: false,
      }
      const mockStatePayload = {
        status: 'WAITING',
        candidates: [],
        counts: {},
        myVotes: [],
        voters: {},
      }

      userService.getSession.mockReturnValue(mockUser)
      voteService.getOrCreateSession.mockReturnValue(mockStatePayload)

      await gateway.onVoteJoin(client, payload)

      expect(userService.getSession).toHaveBeenCalledTimes(1)
      expect(userService.getSession).toHaveBeenCalledWith('socket-1')
      expect(joinMock).toHaveBeenCalledTimes(1)
      expect(joinMock).toHaveBeenCalledWith('vote:room-1')
      expect(voteService.getOrCreateSession).toHaveBeenCalledTimes(1)
      expect(voteService.getOrCreateSession).toHaveBeenCalledWith('room-1', 'user-1')
      expect(emitMock).toHaveBeenCalledTimes(1)
      expect(emitMock).toHaveBeenCalledWith('vote:state', mockStatePayload)
    })
  })

  describe('onVoteLeave', () => {
    it('클라이언트를 투표 룸에서 떠나게 한다', async () => {
      const leaveMock = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined)
      const client = {
        leave: ((room: string) => leaveMock(room)) as (room: string) => Promise<void>,
        id: 'socket-1',
      } as unknown as Socket
      const payload: VoteLeavePayload = {
        roomId: 'room-1',
      }

      await gateway.onVoteLeave(client, payload)

      expect(leaveMock).toHaveBeenCalledTimes(1)
      expect(leaveMock).toHaveBeenCalledWith('vote:room-1')
    })
  })

  describe('onCandidateAdd', () => {
    it('후보를 추가하고 브로드캐스터로 업데이트를 전송한다', () => {
      const client = {
        id: 'socket-1',
      } as Socket
      const payload: VoteCandidateAddPayload = {
        roomId: 'room-1',
        placeId: 'place-1',
        name: '카페',
        address: '서울시 강남구',
      }
      const mockUser = {
        userId: 'user-1',
        name: 'user',
        socketId: 'socket-1',
        roomId: 'room-1',
        isOwner: false,
      }
      const mockCandidate = {
        placeId: 'place-1',
        name: '카페',
        address: '서울시 강남구',
        createdBy: 'user-1',
        createdAt: new Date(),
      }

      userService.getSession.mockReturnValue(mockUser)
      voteService.addCandidatePlace.mockReturnValue(mockCandidate)

      gateway.onCandidateAdd(client, payload)

      expect(userService.getSession).toHaveBeenCalledTimes(1)
      expect(userService.getSession).toHaveBeenCalledWith('socket-1')
      expect(voteService.addCandidatePlace).toHaveBeenCalledTimes(1)
      expect(voteService.addCandidatePlace).toHaveBeenCalledWith('room-1', 'user-1', payload)
      expect(broadcaster.emitToVote).toHaveBeenCalledTimes(1)
      expect(broadcaster.emitToVote).toHaveBeenCalledWith('room-1', 'vote:candidate:updated', mockCandidate)
    })
  })

  describe('onCandidateRemove', () => {
    it('후보를 제거하고 브로드캐스터로 업데이트를 전송한다', () => {
      const client = {
        id: 'socket-1',
      } as Socket
      const payload: VoteCandidateRemovePayload = {
        roomId: 'room-1',
        candidateId: 'candidate-1',
      }
      const mockCandidateId = 'candidate-1'

      voteService.removeCandidatePlace.mockReturnValue(mockCandidateId)

      gateway.onCandidateRemove(client, payload)

      expect(voteService.removeCandidatePlace).toHaveBeenCalledTimes(1)
      expect(voteService.removeCandidatePlace).toHaveBeenCalledWith('room-1', 'candidate-1')
      expect(broadcaster.emitToVote).toHaveBeenCalledTimes(1)
      expect(broadcaster.emitToVote).toHaveBeenCalledWith('room-1', 'vote:candidate:updated', mockCandidateId)
    })
  })

  describe('onCastVote', () => {
    const emitMock = jest.fn<boolean, [string, ...unknown[]]>()
    const client = {
      id: 'socket-1',
      emit: emitMock,
    } as unknown as Socket
    const payload: VoteCastPayload = {
      roomId: 'room-1',
      candidateId: 'candidate-1',
    }
    const mockUser = {
      userId: 'user-1',
      name: 'user',
      socketId: 'socket-1',
      roomId: 'room-1',
      isOwner: false,
    }

    beforeEach(() => {
      jest.clearAllMocks()
      userService.getSession.mockReturnValue(mockUser)
    })

    it('투표를 수행하고 브로드캐스터로 득표수 업데이트를 전송한다', () => {
      const mockUpdatePayload = {
        candidateId: 'candidate-1',
        count: 1,
        userId: 'user-1',
        voters: ['user-1'],
        changed: true,
      }

      voteService.castVote.mockReturnValue(mockUpdatePayload)

      gateway.onCastVote(client, payload)

      expect(userService.getSession).toHaveBeenCalledTimes(1)
      expect(userService.getSession).toHaveBeenCalledWith('socket-1')
      expect(voteService.castVote).toHaveBeenCalledTimes(1)
      expect(voteService.castVote).toHaveBeenCalledWith('room-1', 'user-1', 'candidate-1')
      expect(broadcaster.emitToVote).toHaveBeenCalledTimes(1)
      expect(broadcaster.emitToVote).toHaveBeenCalledWith('room-1', 'vote:counts:updated', {
        candidateId: 'candidate-1',
        count: 1,
        userId: 'user-1',
        voters: ['user-1'],
      })
    })

    it('changed가 true일 때 getMyVotes를 호출하고 vote:me:updated 이벤트를 emit한다', () => {
      const mockUpdatePayload = {
        candidateId: 'candidate-1',
        count: 1,
        userId: 'user-1',
        voters: ['user-1'],
        changed: true,
      }
      const mockMyVotes = {
        myVotes: ['candidate-1'],
      }

      voteService.castVote.mockReturnValue(mockUpdatePayload)
      voteService.getMyVotes.mockReturnValue(mockMyVotes)

      gateway.onCastVote(client, payload)

      expect(voteService.getMyVotes).toHaveBeenCalledTimes(1)
      expect(voteService.getMyVotes).toHaveBeenCalledWith('room-1', 'user-1')
      expect(emitMock).toHaveBeenCalledTimes(1)
      expect(emitMock).toHaveBeenCalledWith('vote:me:updated', mockMyVotes)
    })

    it('changed가 false일 때 getMyVotes를 호출하지 않고 vote:me:updated 이벤트를 emit하지 않는다', () => {
      const mockUpdatePayload = {
        candidateId: 'candidate-1',
        count: 1,
        userId: 'user-1',
        voters: ['user-1'],
        changed: false,
      }

      voteService.castVote.mockReturnValue(mockUpdatePayload)

      gateway.onCastVote(client, payload)

      expect(voteService.getMyVotes).not.toHaveBeenCalled()
      expect(emitMock).not.toHaveBeenCalled()
    })

    it('user가 없으면 예외를 던진다', () => {
      userService.getSession.mockReturnValue(null)

      expect(() => {
        gateway.onCastVote(client, payload)
      }).toThrow()

      expect(voteService.castVote).not.toHaveBeenCalled()
    })

    it('user.roomId가 payload.roomId와 다르면 예외를 던진다', () => {
      const wrongRoomUser = {
        ...mockUser,
        roomId: 'room-2',
      }
      userService.getSession.mockReturnValue(wrongRoomUser)

      expect(() => {
        gateway.onCastVote(client, payload)
      }).toThrow()

      expect(voteService.castVote).not.toHaveBeenCalled()
    })
  })

  describe('onRevokeVote', () => {
    const emitMock = jest.fn<boolean, [string, ...unknown[]]>()
    const client = {
      id: 'socket-1',
      emit: emitMock,
    } as unknown as Socket
    const payload: VoteRevokePayload = {
      roomId: 'room-1',
      candidateId: 'candidate-1',
    }
    const mockUser = {
      userId: 'user-1',
      name: 'user',
      socketId: 'socket-1',
      roomId: 'room-1',
      isOwner: false,
    }

    beforeEach(() => {
      jest.clearAllMocks()
      userService.getSession.mockReturnValue(mockUser)
    })

    it('투표를 취소하고 브로드캐스터로 득표수 업데이트를 전송한다', () => {
      const mockUpdatePayload = {
        candidateId: 'candidate-1',
        count: 0,
        userId: 'user-1',
        voters: [],
        changed: true,
      }

      voteService.revokeVote.mockReturnValue(mockUpdatePayload)

      gateway.onRevokeVote(client, payload)

      expect(userService.getSession).toHaveBeenCalledTimes(1)
      expect(userService.getSession).toHaveBeenCalledWith('socket-1')
      expect(voteService.revokeVote).toHaveBeenCalledTimes(1)
      expect(voteService.revokeVote).toHaveBeenCalledWith('room-1', 'user-1', 'candidate-1')
      expect(broadcaster.emitToVote).toHaveBeenCalledTimes(1)
      expect(broadcaster.emitToVote).toHaveBeenCalledWith('room-1', 'vote:counts:updated', {
        candidateId: 'candidate-1',
        count: 0,
        userId: 'user-1',
        voters: [],
      })
    })

    it('changed가 true일 때 getMyVotes를 호출하고 vote:me:updated 이벤트를 emit한다', () => {
      const mockUpdatePayload = {
        candidateId: 'candidate-1',
        count: 0,
        userId: 'user-1',
        voters: [],
        changed: true,
      }
      const mockMyVotes = {
        myVotes: [],
      }

      voteService.revokeVote.mockReturnValue(mockUpdatePayload)
      voteService.getMyVotes.mockReturnValue(mockMyVotes)

      gateway.onRevokeVote(client, payload)

      expect(voteService.getMyVotes).toHaveBeenCalledTimes(1)
      expect(voteService.getMyVotes).toHaveBeenCalledWith('room-1', 'user-1')
      expect(emitMock).toHaveBeenCalledTimes(1)
      expect(emitMock).toHaveBeenCalledWith('vote:me:updated', mockMyVotes)
    })

    it('changed가 false일 때 getMyVotes를 호출하지 않고 vote:me:updated 이벤트를 emit하지 않는다', () => {
      const mockUpdatePayload = {
        candidateId: 'candidate-1',
        count: 0,
        userId: 'user-1',
        voters: [],
        changed: false,
      }

      voteService.revokeVote.mockReturnValue(mockUpdatePayload)

      gateway.onRevokeVote(client, payload)

      expect(voteService.getMyVotes).not.toHaveBeenCalled()
      expect(emitMock).not.toHaveBeenCalled()
    })

    it('user가 없으면 예외를 던진다', () => {
      userService.getSession.mockReturnValue(null)

      expect(() => {
        gateway.onRevokeVote(client, payload)
      }).toThrow()

      expect(voteService.revokeVote).not.toHaveBeenCalled()
    })

    it('user.roomId가 payload.roomId와 다르면 예외를 던진다', () => {
      const wrongRoomUser = {
        ...mockUser,
        roomId: 'room-2',
      }
      userService.getSession.mockReturnValue(wrongRoomUser)

      expect(() => {
        gateway.onRevokeVote(client, payload)
      }).toThrow()

      expect(voteService.revokeVote).not.toHaveBeenCalled()
    })
  })

  describe('onStartVote', () => {
    it('투표를 시작하고 브로드캐스터로 시작 이벤트를 전송한다', () => {
      const client = {} as Socket
      const payload: VoteStartPayload = {
        roomId: 'room-1',
      }
      const mockStartedPayload = {
        status: 'IN_PROGRESS',
      }

      voteService.startVote.mockReturnValue(mockStartedPayload)

      gateway.onStartVote(client, payload)

      expect(voteService.startVote).toHaveBeenCalledTimes(1)
      expect(voteService.startVote).toHaveBeenCalledWith('room-1')
      expect(broadcaster.emitToVote).toHaveBeenCalledTimes(1)
      expect(broadcaster.emitToVote).toHaveBeenCalledWith('room-1', 'vote:started', mockStartedPayload)
    })
  })

  describe('onEndVote', () => {
    it('투표를 종료하고 브로드캐스터로 종료 이벤트를 전송한다', () => {
      const client = {} as Socket
      const payload: VoteEndPayload = {
        roomId: 'room-1',
      }
      const mockEndedPayload = {
        status: 'COMPLETED',
        candidates: [],
      }

      voteService.endVote.mockReturnValue(mockEndedPayload)

      gateway.onEndVote(client, payload)

      expect(voteService.endVote).toHaveBeenCalledTimes(1)
      expect(voteService.endVote).toHaveBeenCalledWith('room-1')
      expect(broadcaster.emitToVote).toHaveBeenCalledTimes(1)
      expect(broadcaster.emitToVote).toHaveBeenCalledWith('room-1', 'vote:ended', mockEndedPayload)
    })
  })
})
