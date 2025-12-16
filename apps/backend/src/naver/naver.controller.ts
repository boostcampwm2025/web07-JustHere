import { Controller, Get, Query } from '@nestjs/common';
import { NaverService } from './naver.service';
import { NaverGeocodingResponse } from '@web07/types';

@Controller('api/naver')
export class NaverController {
  constructor(private readonly naverService: NaverService) {}

  @Get('geocode')
  async geocode(
    @Query('query') query: string,
  ): Promise<NaverGeocodingResponse> {
    return this.naverService.geocode(query);
  }
}
