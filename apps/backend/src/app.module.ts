import { Module } from '@nestjs/common'
import { AppController } from '@/app.controller'
import { AppService } from '@/app.service'
import { PrismaModule } from '@/prisma/prisma.module'
import { RoomModule } from '@/room/room.module'
import { CategoryModule } from '@/category/category.module'
import { SocketModule } from '@/socket/socket.module'
import { UserModule } from '@/user/user.module'

@Module({
  imports: [PrismaModule, SocketModule, UserModule, CategoryModule, RoomModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
