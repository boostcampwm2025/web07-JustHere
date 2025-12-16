import {
  Controller,
  Post,
  Param,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { MidpointsService } from '@/midpoints/midpoints.service';
import { CalculateMidpointsResponseDto } from '@/midpoints/dto/calculate-midpoints-response.dto';

@Controller('rooms')
export class MidpointsController {
  constructor(private readonly midpointsService: MidpointsService) {}

  @Post(':roomId/midpoints/calculate')
  @HttpCode(HttpStatus.OK)
  async calculateMidpoints(
    @Param('roomId', ParseIntPipe) roomId: number,
  ): Promise<CalculateMidpointsResponseDto> {
    return this.midpointsService.calculateMidpoints(roomId);
  }
}
