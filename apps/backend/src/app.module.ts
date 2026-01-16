import { SwaggerConfigModule } from '@/lib/swagger/swagger.module'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from '@/app.controller'
import { AppService } from '@/app.service'
import { PrismaModule } from '@/lib/prisma/prisma.module'
import { KakaoModule } from '@/modules/kakao/kakao.module'
import { SocketModule } from '@/modules/socket/socket.module'
import { UserModule } from '@/modules/user/user.module'
import { CategoryModule } from '@/modules/category/category.module'
import { RoomModule } from '@/modules/room/room.module'
import { YjsModule } from '@/modules/canvas/yjs.module'
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PrismaModule,
    KakaoModule,
    SocketModule,
    UserModule,
    CategoryModule,
    RoomModule,
    YjsModule,
    SwaggerConfigModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
