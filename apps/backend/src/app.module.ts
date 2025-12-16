import { Module } from '@nestjs/common';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { KakaoModule } from './kakao/kakao.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    KakaoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
