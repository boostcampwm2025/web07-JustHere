import { Module } from '@nestjs/common';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { KakaoModule } from '@/kakao/kakao.module';
import { ConfigModule } from '@nestjs/config';
import { OdsayModule } from '@/odsay/odsay.module';
import { NaverModule } from '@/naver/naver.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    KakaoModule,
    OdsayModule,
    NaverModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
