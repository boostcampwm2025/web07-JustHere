import { Test, TestingModule } from '@nestjs/testing'
import { VoteOwnerGuard } from './vote-owner.guard'
import { VoteService } from '@/modules/vote/vote.service'
import { UserService } from '@/modules/user/user.service'
import { ExecutionContext } from '@nestjs/common'
import { CustomException } from '@/lib/exceptions/custom.exception'
import { ErrorType } from '@/lib/types/response.type'
import { Socket } from 'socket.io'

describe('VoteOwnerGuard', () => {
  let guard: VoteOwnerGuard

  const mockVoteService = {
    getSessionOrThrow: jest.fn(),
  }

  const mockUserService = {
    getSession: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [VoteOwnerGuard, { provide: VoteService, useValue: mockVoteService }, { provide: UserService, useValue: mockUserService }],
    }).compile()

    guard = module.get<VoteOwnerGuard>(VoteOwnerGuard)
  })

  it('가드가 정의되어 있어야 한다', () => {
    expect(guard).toBeDefined()
  })

  describe('canActivate', () => {
    let mockContext: ExecutionContext
    let mockSocket: Socket
    let mockPayload: { roomId?: string }

    beforeEach(() => {
      mockSocket = { id: 'client-id' } as Socket
      mockPayload = { roomId: 'room-id' }

      mockContext = {
        switchToWs: jest.fn().mockReturnValue({
          getClient: jest.fn().mockReturnValue(mockSocket),
          getData: jest.fn().mockReturnValue(mockPayload),
        }),
      } as unknown as ExecutionContext
    })

    it('모든 조건이 충족되면 true를 반환해야 한다', () => {
      mockUserService.getSession.mockReturnValue({ isOwner: true })
      mockVoteService.getSessionOrThrow.mockReturnValue({})

      const result = guard.canActivate(mockContext)

      expect(result).toBe(true)
      expect(mockUserService.getSession).toHaveBeenCalledWith('client-id')
      expect(mockVoteService.getSessionOrThrow).toHaveBeenCalledWith('room-id')
    })

    it('Room에 접속되지 않았으면 NotInRoom 예외를 던져야 한다', () => {
      mockUserService.getSession.mockReturnValue(null)

      expect(() => guard.canActivate(mockContext)).toThrow(new CustomException(ErrorType.NotInRoom, 'Room에 접속되지 않았습니다.'))
    })

    it('투표 세션 ID(roomId)가 없으면 BadRequest 예외를 던져야 한다', () => {
      mockUserService.getSession.mockReturnValue({ isOwner: true })
      mockPayload.roomId = undefined

      expect(() => guard.canActivate(mockContext)).toThrow(new CustomException(ErrorType.BadRequest, '투표 세션 ID(roomId)가 필요합니다.'))
    })

    it('투표 세션이 존재하지 않으면 NotFound 예외를 던져야 한다', () => {
      mockUserService.getSession.mockReturnValue({ isOwner: true })
      mockVoteService.getSessionOrThrow.mockImplementation(() => {
        throw new CustomException(ErrorType.NotFound, '투표 세션이 존재하지 않습니다.')
      })

      expect(() => guard.canActivate(mockContext)).toThrow(new CustomException(ErrorType.NotFound, '투표 세션이 존재하지 않습니다.'))
    })

    it('방장 권한이 없으면 NotOwner 예외를 던져야 한다', () => {
      mockUserService.getSession.mockReturnValue({ isOwner: false })
      mockVoteService.getSessionOrThrow.mockReturnValue({})

      expect(() => guard.canActivate(mockContext)).toThrow(new CustomException(ErrorType.NotOwner, '방장 권한이 필요합니다.'))
    })
  })
})
