import { VoteCandidate } from '@/modules/vote/vote.types'
import { Controller, Get, Param } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import { VoteService } from './vote.service'

@ApiTags('vote')
@Controller('vote')
export class VoteController {
  constructor(private readonly voteService: VoteService) {}

  @Get('/results/:roomId')
  @ApiOperation({ summary: '투표 최종 결과 조회', description: 'Room 내 모든 카테고리의 투표 최종 결과를 조회합니다.' })
  @ApiParam({ name: 'roomId', description: '룸 ID' })
  @ApiResponse({ status: 200, description: '카테고리별 투표 결과 목록' })
  async getVoteResults(@Param('roomId') roomId: string): Promise<VoteCandidate[]> {
    return this.voteService.getVoteResults(roomId)
  }
}
