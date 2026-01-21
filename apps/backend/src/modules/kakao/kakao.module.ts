import { Module } from '@nestjs/common'
import { KakaoController } from './kakao.controller'
import { KakaoService } from './kakao.service'
import { RoomModule } from '../room/room.module'

@Module({
  imports: [RoomModule],
  controllers: [KakaoController],
  providers: [KakaoService],
  exports: [KakaoService],
})
export class KakaoModule {}
