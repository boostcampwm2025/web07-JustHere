import { Controller, Get, Param, Res } from '@nestjs/common'
import type { Response } from 'express'
import { ShareService } from './share.service'

@Controller('share')
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  @Get('room/:slug')
  async shareRoom(@Param('slug') slug: string, @Res() res: Response) {
    const { title, description, imageUrl, redirectUrl } = await this.shareService.getRoomMetadata(slug)
    const html = this.generateHtml(title, description, imageUrl, redirectUrl)

    res.set('Content-Type', 'text/html')
    res.send(html)
  }

  @Get('result/:slug')
  async shareResult(@Param('slug') slug: string, @Res() res: Response) {
    const { title, description, imageUrl, redirectUrl } = await this.shareService.getResultMetadata(slug)
    const html = this.generateHtml(title, description, imageUrl, redirectUrl)

    res.set('Content-Type', 'text/html')
    res.send(html)
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
