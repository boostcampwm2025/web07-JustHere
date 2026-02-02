import { Controller, Get, Param, Res } from '@nestjs/common'
import type { Response } from 'express'
import { ShareService } from './share.service'
import { generateOgHtml } from '@/lib/utils/og-template.util'

@Controller('share')
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  @Get('room/:slug')
  async shareRoom(@Param('slug') slug: string, @Res() res: Response) {
    const { title, description, imageUrl, redirectUrl } = await this.shareService.getRoomMetadata(slug)
    const html = generateOgHtml(title, description, imageUrl, redirectUrl)

    res.set('Content-Type', 'text/html')
    res.send(html)
  }

  @Get('result/:slug')
  async shareResult(@Param('slug') slug: string, @Res() res: Response) {
    const { title, description, imageUrl, redirectUrl } = await this.shareService.getResultMetadata(slug)
    const html = generateOgHtml(title, description, imageUrl, redirectUrl)

    res.set('Content-Type', 'text/html')
    res.send(html)
  }
}
