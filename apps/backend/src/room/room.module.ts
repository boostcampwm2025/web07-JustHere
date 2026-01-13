import { Module } from '@nestjs/common'
import { CategoryModule } from '@/category/category.module'
import { SocketModule } from '@/socket/socket.module'
import { UserModule } from '@/user/user.module'
import { RoomService } from './room.service'
import { RoomGateway } from './room.gateway'

@Module({
  imports: [CategoryModule, SocketModule, UserModule],
  providers: [RoomService, RoomGateway],
  exports: [RoomService],
})
export class RoomModule {}
