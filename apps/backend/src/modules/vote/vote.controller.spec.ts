import { Test, TestingModule } from '@nestjs/testing'
import { VoteController } from './vote.controller'
import { VoteService } from './vote.service'
import { VoteCandidate } from './vote.types'

describe('VoteController', () => {
  let controller: VoteController

  const voteService = {
    getVoteResults: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VoteController],
      providers: [{ provide: VoteService, useValue: voteService }],
    }).compile()

    controller = module.get<VoteController>(VoteController)
  })

  describe('getVoteResults', () => {
    it('roomId로 투표 결과를 조회하고 결과를 반환한다', async () => {
      const roomId = 'room-1'
      const mockResults: VoteCandidate[] = [
        {
          category: '음식점',
          result: [
            {
              placeId: 'place-1',
              name: '카페 A',
              address: '서울시 강남구',
              createdBy: 'user-1',
              createdAt: new Date(),
            },
          ],
        },
      ]

      voteService.getVoteResults.mockResolvedValue(mockResults)

      const result = await controller.getVoteResults(roomId)

      expect(voteService.getVoteResults).toHaveBeenCalledTimes(1)
      expect(voteService.getVoteResults).toHaveBeenCalledWith(roomId)
      expect(result).toEqual(mockResults)
    })

    it('결과가 없으면 빈 배열을 반환한다', async () => {
      const roomId = 'room-1'

      voteService.getVoteResults.mockResolvedValue([])

      const result = await controller.getVoteResults(roomId)

      expect(result).toEqual([])
    })
  })
})
