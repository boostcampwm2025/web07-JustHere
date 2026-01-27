import { HttpExceptionFilter } from '@/lib/filter'
import { HttpLoggingInterceptor, ResponseBuilderInterceptor } from '@/lib/interceptors'
import { SwaggerConfigModule } from '@/lib/swagger/swagger.module'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
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
import { ScheduleModule } from '@nestjs/schedule'

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
    SwaggerConfigModule,
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
