import { Controller, Get, Param, Header, Req } from '@nestjs/common'
import type { Request } from 'express'
import { ShareService } from './share.service'
import { generateOgHtml } from '@/lib/utils/og-template.util'

@Controller('share')
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  private appendQueryString(url: string, req: Request): string {
    const queryIndex = req.originalUrl.indexOf('?')
    if (queryIndex < 0) return url
    const queryString = req.originalUrl.slice(queryIndex + 1)
    if (!queryString) return url
    return `${url}${url.includes('?') ? '&' : '?'}${queryString}`
  }

  @Get('room/:slug')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async shareRoom(@Param('slug') slug: string, @Req() req: Request) {
    const { title, description, imageUrl, redirectUrl } = await this.shareService.getRoomMetadata(slug)
    return generateOgHtml(title, description, imageUrl, this.appendQueryString(redirectUrl, req))
  }

  @Get('result/:slug')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async shareResult(@Param('slug') slug: string, @Req() req: Request) {
    const { title, description, imageUrl, redirectUrl } = await this.shareService.getResultMetadata(slug)
    return generateOgHtml(title, description, imageUrl, this.appendQueryString(redirectUrl, req))
  }
}
