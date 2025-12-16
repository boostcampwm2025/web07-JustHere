import { Controller, Get, Query } from '@nestjs/common';
import { OdsayService } from './odsay.service';
import { OdsayTransitResponse, OdsayLoadLaneResponse } from '@web07/types';

@Controller('api/odsay')
export class OdsayController {
  constructor(private readonly odsayService: OdsayService) {}

  @Get('transit-route')
  async getTransitRoute(
    @Query('SX') sx: string,
    @Query('SY') sy: string,
    @Query('EX') ex: string,
    @Query('EY') ey: string,
  ): Promise<OdsayTransitResponse> {
    return this.odsayService.searchTransitRoute(
      parseFloat(sx),
      parseFloat(sy),
      parseFloat(ex),
      parseFloat(ey),
    );
  }

  @Get('load-lane')
  async loadLane(
    @Query('mapObject') mapObject: string,
  ): Promise<OdsayLoadLaneResponse> {
    return this.odsayService.loadLane(mapObject);
  }
}
