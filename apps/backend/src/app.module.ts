import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from '@/app.controller'
import { AppService } from '@/app.service'
import { PrismaModule } from '@/prisma/prisma.module'
import { KakaoModule } from '@/kakao/kakao.module'
import { SocketModule } from '@/socket/socket.module'
import { UserModule } from '@/user/user.module'
import { CategoryModule } from '@/category/category.module'
import { RoomModule } from '@/room/room.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PrismaModule,
    KakaoModule,
    SocketModule,
    UserModule,
    CategoryModule,
    RoomModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
