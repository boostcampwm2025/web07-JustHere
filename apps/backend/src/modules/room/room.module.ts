import { Module } from '@nestjs/common'
import { PrismaModule } from '@/lib/prisma/prisma.module'
import { CategoryModule } from '@/modules/category/category.module'
import { SocketModule } from '@/modules/socket/socket.module'
import { UserModule } from '@/modules/user/user.module'
import { RoomRepository } from './room.repository'
import { RoomService } from './room.service'
import { RoomController } from './room.controller'
import { RoomGateway } from './room.gateway'

@Module({
  imports: [PrismaModule, CategoryModule, SocketModule, UserModule],
  controllers: [RoomController],
  providers: [RoomRepository, RoomService, RoomGateway],
  exports: [RoomService],
})
export class RoomModule {}
