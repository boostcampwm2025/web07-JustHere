import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OdsayController } from './odsay.controller';
import { OdsayService } from './odsay.service';
import { MiddleLocationService } from './middle-location.service';
import { KakaoModule } from '@/kakao/kakao.module';

@Module({
  imports: [ConfigModule, KakaoModule],
  controllers: [OdsayController],
  providers: [OdsayService, MiddleLocationService],
  exports: [OdsayService],
})
export class OdsayModule {}
