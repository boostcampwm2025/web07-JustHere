import { Controller, Get, Param, Res, Logger } from '@nestjs/common'
import type { Response } from 'express'
import { RoomService } from './room.service'
import { VoteService } from '../vote/vote.service'
import { CategoryService } from '../category/category.service'
import { ConfigService } from '@nestjs/config'

@Controller('share')
export class ShareController {
  private readonly logger = new Logger(ShareController.name)

  constructor(
    private readonly roomService: RoomService,
    private readonly voteService: VoteService,
    private readonly categoryService: CategoryService,
    private readonly configService: ConfigService,
  ) {}

  private getBaseUrl() {
    return this.configService.get<string>('APP_BASE_URL') ?? 'https://justhere.p-e.kr'
  }

  @Get('room/:slug')
  async shareRoom(@Param('slug') slug: string, @Res() res: Response) {
    // 1. 방 정보 조회 (존재 여부 확인)
    await this.roomService.findOneBySlug(slug)

    const title = '딱! 여기 - 실시간 모임 장소 선정'
    const description = '우리 어디서 만나? 딱! 여기에서 실시간으로 재밌게 정하자!'
    const baseUrl = this.getBaseUrl()
    const imageUrl = `${baseUrl}/logo-kr.png`
    const redirectUrl = `${baseUrl}/room/${slug}`

    // 2. HTML 응답
    const html = this.generateHtml(title, description, imageUrl, redirectUrl)
    res.set('Content-Type', 'text/html')
    res.send(html)
  }

  @Get('result/:slug')
  async shareResult(@Param('slug') slug: string, @Res() res: Response) {
    const baseUrl = this.getBaseUrl()
    const redirectUrl = `${baseUrl}/result/${slug}`
    const defaultTitle = '모임 장소가 결정되었습니다! - 딱! 여기'
    const defaultDesc = '친구들과 함께 정한 모임 장소를 확인해보세요.'
    const defaultImage = `${baseUrl}/logo-kr.png`

    try {
      const room = await this.roomService.findOneBySlug(slug)
      if (!room) throw new Error('Room not found')

      const categories = await this.categoryService.findByRoomId(room.id)
      this.logger.log(`Share Request for slug: ${slug}, RoomId: ${room.id}, Categories: ${categories.length}`)

      let winnerName = ''
      let winnerImage = ''

      for (const category of categories) {
        const voteRoomId = `${room.id}:${category.id}`
        const winner = this.voteService.getWinnerCandidate(voteRoomId)

        if (winner) {
          this.logger.log(`Winner Found: ${winner.name}, Image: ${winner.imageUrl}`)
          winnerName = winner.name
          winnerImage = winner.imageUrl || ''
          break
        }
      }

      const title = winnerName ? `${winnerName} - 모임 장소 결정완료!` : defaultTitle
      const description = winnerName ? `모임 장소로 ${winnerName} 선정되었습니다.` : defaultDesc
      const imageUrl = winnerImage || defaultImage

      const html = this.generateHtml(title, description, imageUrl, redirectUrl)
      res.set('Content-Type', 'text/html')
      res.send(html)
    } catch {
      const html = this.generateHtml(defaultTitle, defaultDesc, defaultImage, redirectUrl)
      res.set('Content-Type', 'text/html')
      res.send(html)
    }
  }

  private generateHtml(title: string, description: string, imageUrl: string, redirectUrl: string) {
    const safeTitle = this.escapeHtml(title)
    const safeDescription = this.escapeHtml(description)
    const safeImageUrl = this.escapeHtml(imageUrl)
    const safeRedirectUrl = this.escapeHtml(redirectUrl)
    return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>${safeTitle}</title>
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDescription}" />
    <meta property="og:image" content="${safeImageUrl}" />
    <meta property="og:url" content="${safeRedirectUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="딱! 여기" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDescription}" />
    <meta name="twitter:image" content="${safeImageUrl}" />
    
    <meta http-equiv="refresh" content="0;url=${safeRedirectUrl}">
    <script>window.location.href = "${safeRedirectUrl}";</script>
</head>
<body>
    <p>리다이렉트 중... <a href="${safeRedirectUrl}">이동하지 않으면 클릭하세요</a></p>
</body>
</html>`
  }

  private escapeHtml(value: string) {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
  }
}
