import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { RoomService } from './room.service'
import { VoteService } from '../vote/vote.service'
import { CategoryService } from '../category/category.service'
import { CustomException } from '@/lib/exceptions/custom.exception'
import { ErrorType } from '@/lib/types/response.type'

export interface ShareMetadata {
  title: string
  description: string
  imageUrl: string
  redirectUrl: string
}

@Injectable()
export class ShareService {
  private readonly logger = new Logger(ShareService.name)

  constructor(
    private readonly roomService: RoomService,
    private readonly voteService: VoteService,
    private readonly categoryService: CategoryService,
    private readonly configService: ConfigService,
  ) {}

  private getBaseUrl() {
    return this.configService.get<string>('APP_BASE_URL') ?? 'https://justhere.p-e.kr'
  }

  async getRoomMetadata(slug: string): Promise<ShareMetadata> {
    const room = await this.roomService.findOneBySlug(slug)
    if (!room) {
      throw new CustomException(ErrorType.NotFound, '방을 찾을 수 없습니다.')
    }

    const baseUrl = this.getBaseUrl()
    return {
      title: '딱! 여기 - 실시간 모임 장소 선정',
      description: '우리 어디서 만나? 딱! 여기에서 실시간으로 재밌게 정하자!',
      imageUrl: `${baseUrl}/logo-kr.png`,
      redirectUrl: `${baseUrl}/room/${slug}`,
    }
  }

  async getResultMetadata(slug: string): Promise<ShareMetadata> {
    const baseUrl = this.getBaseUrl()
    const redirectUrl = `${baseUrl}/result/${slug}`
    const defaultMeta = {
      title: '모임 장소가 결정되었습니다! - 딱! 여기',
      description: '친구들과 함께 정한 모임 장소를 확인해보세요.',
      imageUrl: `${baseUrl}/logo-kr.png`,
      redirectUrl,
    }

    try {
      const room = await this.roomService.findOneBySlug(slug)
      if (!room) {
        throw new CustomException(ErrorType.NotFound, '방을 찾을 수 없습니다.')
      }

      const categories = await this.categoryService.findByRoomId(room.id)

      let winnerName = ''
      let winnerImage = ''

      for (const category of categories) {
        const voteRoomId = `${room.id}:${category.id}`
        const winners = this.voteService.getWinnerCandidates(voteRoomId)

        if (winners.length > 0) {
          const winner = winners[0]
          winnerName = winner.name
          if (winners.length > 1) {
            winnerName += ` 외 ${winners.length - 1}곳`
          }
          winnerImage = winner.imageUrl || ''
          break
        }
      }

      const title = winnerName ? `${winnerName} - 모임 장소 결정완료!` : defaultMeta.title
      const description = winnerName ? `${winnerName}, 딱! 여기에서 만나요!` : defaultMeta.description
      const imageUrl = winnerImage || defaultMeta.imageUrl

      return { title, description, imageUrl, redirectUrl }
    } catch (error) {
      this.logger.error(`Error generating result metadata for slug ${slug}`, error)
      if (error instanceof CustomException) {
        throw error
      }
      return defaultMeta
    }
  }
}
