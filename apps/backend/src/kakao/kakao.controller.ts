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
        `[Response] directions - success, routes count: ${result.routes.length}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`[Error] directions - ${error}`);
      throw error;
    }
  }

  @Get('search-address')
  async searchAddress(
    @Query('query') query: string,
  ): Promise<KakaoAddressSearchResponse> {
    try {
      return await this.kakaoService.searchAddress(query);
    } catch (error) {
      this.logger.error(`[Error] directions - ${error}`);
      throw error;
    }
  }
}
