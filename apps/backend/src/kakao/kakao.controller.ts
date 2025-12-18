import { Controller, Get, Query, Logger } from '@nestjs/common';
import { KakaoService } from './kakao.service';
import {
  KakaoLocalSearchResponse,
  KakaoDirectionResponse,
  KakaoAddressSearchResponse,
} from '@web07/types';

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

  @Get('search-address')
  async searchAddress(
    @Query('query') query: string,
  ): Promise<KakaoAddressSearchResponse> {
    try {
      return await this.kakaoService.searchAddress(query);
    } catch (error) {
      this.logger.error(`[Error] search-address - ${error}`);
      throw error;
    }
  }

  @Get('directions')
  async getDirections(
    @Query('originX') originX: number,
    @Query('originY') originY: number,
    @Query('destinationX') destinationX: number,
    @Query('destinationY') destinationY: number,
  ): Promise<KakaoDirectionResponse> {
    this.logger.log(
      `[Request] directions - origin: ${originX},${originY}, destination: ${destinationX},${destinationY}`,
    );

    try {
      const result = await this.kakaoService.getDirections(
        originX,
        originY,
        destinationX,
        destinationY,
      );
      this.logger.log(
        `[Response] directions - success, routes count: ${result.routes?.length || 0}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`[Error] directions - ${error}`);
      throw error;
    }
  }
}
