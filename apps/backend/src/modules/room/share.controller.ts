import { Controller, Get, Param, Header } from '@nestjs/common'
import { ShareService } from './share.service'
import { generateOgHtml } from '@/lib/utils/og-template.util'

@Controller('share')
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  @Get('room/:slug')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async shareRoom(@Param('slug') slug: string) {
    const { title, description, imageUrl, redirectUrl } = await this.shareService.getRoomMetadata(slug)
    return generateOgHtml(title, description, imageUrl, redirectUrl)
  }

  @Get('result/:slug')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async shareResult(@Param('slug') slug: string) {
    const { title, description, imageUrl, redirectUrl } = await this.shareService.getResultMetadata(slug)
    return generateOgHtml(title, description, imageUrl, redirectUrl)
  }
}
