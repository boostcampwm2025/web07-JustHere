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
    @Query('size') size?: number,
  ): Promise<KakaoLocalSearchResponse> {
    this.logger.log(
      `[Request] local-search - query: ${query}, x: ${x}, y: ${y}, radius: ${radius}, page: ${page}, size: ${size}`,
    );

    try {
      const result = await this.kakaoService.searchLocal(
        query,
        x,
        y,
        radius,
        page,
        size,
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

  @Get('category-search')
  async searchCategory(
    @Query('category_group_code') categoryGroupCode: string,
    @Query('x') x: number,
    @Query('y') y: number,
    @Query('radius') radius?: number,
    @Query('page') page?: number,
    @Query('sort') sort?: 'distance' | 'accuracy',
    @Query('size') size?: number,
  ): Promise<KakaoLocalSearchResponse> {
    this.logger.log(
      `[Request] category-search - code: ${categoryGroupCode}, x: ${x}, y: ${y}, radius: ${radius}, page: ${page}, size: ${size}`,
    );

    try {
      const result = await this.kakaoService.searchCategory(
        categoryGroupCode,
        x,
        y,
        radius,
        page,
        sort,
        size,
      );
      this.logger.log(
        `[Response] category-search - success, result count: ${result.documents.length}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`[Error] category-search - ${error}`);
      throw error;
    }
  }

  @Get('image-search')
  async searchImage(
    @Query('query') query: string,
  ): Promise<{ imageUrl: string | null }> {
    this.logger.log(`[Request] image-search - query: ${query}`);
    const imageUrl = await this.kakaoService.searchImage(query);
    return { imageUrl };
  }
}
