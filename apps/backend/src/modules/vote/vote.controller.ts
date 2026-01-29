import { CustomException } from '@/lib/exceptions/custom.exception'
import { VoteSession, VoteStatus, Candidate } from '@/modules/vote/vote.types'
import { Controller, Get, Param } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { VoteService } from './vote.service'
import { CategoryService } from '@/modules/category/category.service'
import { VoteCandidate } from './dto/vote.s2c.dto'

@ApiTags('vote')
@Controller('vote')
export class VoteController {
  constructor(
    private readonly voteService: VoteService,
    private readonly categoryService: CategoryService,
  ) {}

  @Get('/results/:roomId')
  async getVoteResults(@Param('roomId') roomId: string): Promise<VoteCandidate[]> {
    const categories = await this.categoryService.findByRoomId(roomId)
    const results: VoteCandidate[] = []

    for (const category of categories) {
      const voteRoomId = `${roomId}:${category.id}`
      let session: VoteSession

      try {
        session = this.voteService.getSessionOrThrow(voteRoomId)
      } catch (e) {
        if (e instanceof CustomException) {
          continue
        }
        throw e
      }

      if (session.status !== VoteStatus.COMPLETED) {
        continue
      }

      const { candidates, totalCounts } = session
      if (candidates.size === 0) continue

      let maxVotes = 0
      for (const count of totalCounts.values()) {
        if (count >= maxVotes) {
          maxVotes = count
        }
      }

      if (maxVotes === 0) continue

      const winners: Candidate[] = []
      for (const candidate of candidates.values()) {
        if ((totalCounts.get(candidate.placeId) ?? 0) === maxVotes) {
          winners.push(candidate)
        }
      }

      results.push({
        category: category.title,
        result: winners,
      })
    }

    return results
  }
}
