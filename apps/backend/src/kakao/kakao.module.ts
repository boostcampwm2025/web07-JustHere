import { Module } from '@nestjs/common'
import { KakaoController } from './kakao.controller'
import { KakaoService } from './kakao.service'

@Module({
  controllers: [KakaoController],
  providers: [KakaoService],
  exports: [KakaoService],
})
export class KakaoModule {}
