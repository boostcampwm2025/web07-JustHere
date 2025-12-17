import { Controller, Get, Query } from '@nestjs/common';
import { KakaoPlacesService } from './kakao-places.service';

@Controller('kakao')
export class KakaoController {
  constructor(private readonly kakaoPlacesService: KakaoPlacesService) {}

  @Get('addresses')
  async searchAddresses(@Query('query') query: string) {
    if (!query) {
      return { documents: [] };
    }
    const results = await this.kakaoPlacesService.searchAddresses(query);
    return { documents: results };
  }
}
