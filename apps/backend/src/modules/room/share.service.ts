import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
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
      redirectUrl: `${baseUrl}/room/${encodeURIComponent(slug)}`,
    }
  }

  async getResultMetadata(slug: string): Promise<ShareMetadata> {
    const baseUrl = this.getBaseUrl()
    const redirectUrl = `${baseUrl}/result/${encodeURIComponent(slug)}`
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
      let winnerPlaceId = ''

      for (const category of categories) {
        const voteRoomId = `${room.id}:${category.id}`
        const winners = this.voteService.getWinnerCandidates(voteRoomId)

        if (winners.length > 0) {
          const winner = winners[0]
          winnerName = winner.name
          if (winners.length > 1) {
            winnerName += ` 외 ${winners.length - 1}곳`
          }
          winnerPlaceId = winner.placeId
          break
        }
      }

      const title = winnerName ? `${winnerName} - 모임 장소 결정완료!` : defaultMeta.title
      const description = winnerName ? `${winnerName}, 딱! 여기에서 만나요!` : defaultMeta.description
      const imageUrl = winnerPlaceId ? `${baseUrl}/api/share/image/${winnerPlaceId}` : defaultMeta.imageUrl

      return { title, description, imageUrl, redirectUrl }
    } catch (error) {
      if (error instanceof CustomException) {
        throw error
      }
      this.logger.error(`Error generating result metadata for slug ${slug}`, error)
      return defaultMeta
    }
  }

  async getLatestPhotoUri(placeId: string): Promise<string> {
    const apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY')
    if (!apiKey) return `${this.getBaseUrl()}/logo-kr.png`

    try {
      const { data } = await axios.get<{ photos?: { name: string }[] }>(`https://places.googleapis.com/v1/places/${placeId}`, {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'photos',
        },
        params: { languageCode: 'ko' },
      })

      const photos = data.photos ?? []
      if (photos.length > 0) {
        const photoUrl = `https://places.googleapis.com/v1/${photos[0].name}/media?maxWidthPx=400&maxHeightPx=400&skipHttpRedirect=true&key=${apiKey}`
        const photoResponse = await axios.get<{ photoUri: string }>(photoUrl)
        return photoResponse.data.photoUri
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status
        const message = (error.response?.data as { error?: { message?: string } })?.error?.message ?? error.message
        this.logger.error(`Google API error fetching photo for placeId ${placeId} [${status}]: ${message}`)
      } else {
        this.logger.error(`Error fetching latest photo for placeId ${placeId}`, error)
      }
    }
    return `${this.getBaseUrl()}/logo-kr.png`
  }
}
