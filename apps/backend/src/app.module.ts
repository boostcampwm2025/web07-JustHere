import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { RoomsModule } from '@/rooms/rooms.module';
import { ParticipantsModule } from '@/participants/participants.module';
import { MidpointsModule } from '@/midpoints/midpoints.module';
import { KakaoModule } from '@/kakao/kakao.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 3306),
        username: configService.get<string>('DB_USERNAME', 'root'),
        password: configService.get<string>('DB_PASSWORD', ''),
        database: configService.get<string>('DB_DATABASE', 'just_here'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true, // 프로토타입에서는 true, 프로덕션에서는 false
        logging: false, // SQL 쿼리 로깅 비활성화
      }),
      inject: [ConfigService],
    }),
    RoomsModule,
    ParticipantsModule,
    MidpointsModule,
    KakaoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
