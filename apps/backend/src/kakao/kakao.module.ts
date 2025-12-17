import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { KakaoController } from './kakao.controller';
import { KakaoPlacesService } from './kakao-places.service';
import { KakaoDirectionsService } from './kakao-directions.service';

@Module({
  imports: [HttpModule],
  controllers: [KakaoController],
  providers: [KakaoPlacesService, KakaoDirectionsService],
  exports: [KakaoPlacesService, KakaoDirectionsService],
})
export class KakaoModule {}
