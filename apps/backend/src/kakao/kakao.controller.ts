import { Controller, Get, Query, Logger } from '@nestjs/common';
import { KakaoService } from './kakao.service';
import { KakaoLocalSearchResponse } from '@web07/types';

@Controller('api/kakao')
export class KakaoController {
  private readonly logger = new Logger(KakaoController.name);

  constructor(private readonly kakaoService: KakaoService) {}

  @Get('local-search')
  async searchLocal(
    @Query('query') query: string,
    @Query('x') x?: number,
    @Query('y') y?: number,
    @Query('radius') radius?: number,
    @Query('page') page?: number,
  ): Promise<KakaoLocalSearchResponse> {
    this.logger.log(
      `[Request] local-search - query: ${query}, x: ${x}, y: ${y}, radius: ${radius}, page: ${page}`,
    );

    try {
      const result = await this.kakaoService.searchLocal(
        query,
        x,
        y,
        radius,
        page,
      );
      this.logger.log(
        `[Response] local-search - success, result count: ${result.documents.length}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`[Error] local-search - ${error}`);
      throw error;
    }
  }
}
