import { HttpExceptionFilter } from '@/lib/filter'
import { HttpLoggingInterceptor, ResponseBuilderInterceptor } from '@/lib/interceptors'
import { MetricModule } from '@/lib/metric/metric.module'
import { SwaggerConfigModule } from '@/lib/swagger/swagger.module'
import { VoteModule } from '@/modules/vote/vote.module'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { PrometheusModule } from '@willsoto/nestjs-prometheus'
import { AppController } from '@/app.controller'
import { AppService } from '@/app.service'
import { PrismaModule } from '@/lib/prisma/prisma.module'
import { GoogleModule } from '@/modules/google/google.module'
import { SocketModule } from '@/modules/socket/socket.module'
import { UserModule } from '@/modules/user/user.module'
import { CategoryModule } from '@/modules/category/category.module'
import { RoomModule } from '@/modules/room/room.module'
import { YjsModule } from '@/modules/canvas/yjs.module'
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PrismaModule,
    GoogleModule,
    SocketModule,
    UserModule,
    CategoryModule,
    RoomModule,
    YjsModule,
    VoteModule,
    SwaggerConfigModule,
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true, // CPU, Memory, EventLoop 등 기본 지표 수집
      },
      defaultLabels: {
        // Docker 컨테이너 ID(Hostname)를 라벨로 사용하여 여러 대 서버 사용 시 구분가능하게 함
        app: 'justhere-app-server',
        instance: process.env.HOSTNAME ?? 'backend',
      },
    }),
    MetricModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggingInterceptor, // 로깅 먼저 실행
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseBuilderInterceptor, // 응답 변환
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    AppService,
  ],
})
export class AppModule {}
