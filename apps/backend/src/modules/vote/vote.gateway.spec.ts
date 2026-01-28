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
  }

  const broadcaster = {
    setServer: jest.fn(),
    emitToVote: jest.fn(),
  }

  const userService = {
    getSession: jest.fn(),
    removeSession: jest.fn(),
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
    it('사용자 세션이 없으면 아무것도 하지 않는다', async () => {
      const leaveMock = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined)
      const client = {
        rooms: new Set(['vote:room-1', 'vote:room-2']),
        leave: ((room: string) => leaveMock(room)) as (room: string) => Promise<void>,
        id: 'socket-1',
      } as unknown as Socket

      userService.removeSession.mockReturnValue(undefined)

      await gateway.handleDisconnect(client)

      expect(userService.removeSession).toHaveBeenCalledTimes(1)
      expect(userService.removeSession).toHaveBeenCalledWith('socket-1')
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
      const mockUserSession = {
        userId: 'user-1',
        name: 'user',
        socketId: 'socket-1',
        roomId: 'room-1',
        isOwner: false,
      }

      gateway.server = { in: inMock } as unknown as Server

      userService.removeSession.mockReturnValue(mockUserSession)

      await gateway.handleDisconnect(client)

      expect(userService.removeSession).toHaveBeenCalledTimes(1)
      expect(userService.removeSession).toHaveBeenCalledWith('socket-1')
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
      const mockUser = {
        userId: 'user-1',
        name: 'user',
        socketId: 'socket-1',
        roomId: 'room-1',
        isOwner: false,
      }
      const mockCandidateId = 'candidate-1'

      userService.getSession.mockReturnValue(mockUser)
      voteService.removeCandidatePlace.mockReturnValue(mockCandidateId)

      gateway.onCandidateRemove(client, payload)

      expect(userService.getSession).toHaveBeenCalledTimes(1)
      expect(userService.getSession).toHaveBeenCalledWith('socket-1')
      expect(voteService.removeCandidatePlace).toHaveBeenCalledTimes(1)
      expect(voteService.removeCandidatePlace).toHaveBeenCalledWith('room-1', 'candidate-1')
      expect(broadcaster.emitToVote).toHaveBeenCalledTimes(1)
      expect(broadcaster.emitToVote).toHaveBeenCalledWith('room-1', 'vote:candidate:updated', mockCandidateId)
    })
  })

  describe('onCastVote', () => {
    it('투표를 수행하고 브로드캐스터로 득표수 업데이트를 전송한다', () => {
      const client = {
        id: 'socket-1',
      } as Socket
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
      const mockUpdatePayload = {
        candidateId: 'candidate-1',
        count: 1,
        userId: 'user-1',
      }

      userService.getSession.mockReturnValue(mockUser)
      voteService.castVote.mockReturnValue(mockUpdatePayload)

      gateway.onCastVote(client, payload)

      expect(userService.getSession).toHaveBeenCalledTimes(1)
      expect(userService.getSession).toHaveBeenCalledWith('socket-1')
      expect(voteService.castVote).toHaveBeenCalledTimes(1)
      expect(voteService.castVote).toHaveBeenCalledWith('room-1', 'user-1', 'candidate-1')
      expect(broadcaster.emitToVote).toHaveBeenCalledTimes(1)
      expect(broadcaster.emitToVote).toHaveBeenCalledWith('room-1', 'vote:counts:updated', mockUpdatePayload)
    })
  })

  describe('onRevokeVote', () => {
    it('투표를 취소하고 브로드캐스터로 득표수 업데이트를 전송한다', () => {
      const client = {
        id: 'socket-1',
      } as Socket
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
      const mockUpdatePayload = {
        candidateId: 'candidate-1',
        count: 0,
        userId: 'user-1',
      }

      userService.getSession.mockReturnValue(mockUser)
      voteService.revokeVote.mockReturnValue(mockUpdatePayload)

      gateway.onRevokeVote(client, payload)

      expect(userService.getSession).toHaveBeenCalledTimes(1)
      expect(userService.getSession).toHaveBeenCalledWith('socket-1')
      expect(voteService.revokeVote).toHaveBeenCalledTimes(1)
      expect(voteService.revokeVote).toHaveBeenCalledWith('room-1', 'user-1', 'candidate-1')
      expect(broadcaster.emitToVote).toHaveBeenCalledTimes(1)
      expect(broadcaster.emitToVote).toHaveBeenCalledWith('room-1', 'vote:counts:updated', mockUpdatePayload)
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
