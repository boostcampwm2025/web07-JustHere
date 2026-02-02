import { MetricModule } from '@/lib/metric/metric.module'
import { Module } from '@nestjs/common'
import { PrismaModule } from '@/lib/prisma/prisma.module'
import { CategoryModule } from '@/modules/category/category.module'
import { SocketModule } from '@/modules/socket/socket.module'
import { UserModule } from '@/modules/user/user.module'
import { VoteModule } from '@/modules/vote/vote.module'
import { RoomRepository } from './room.repository'
import { RoomService } from './room.service'
import { RoomController } from './room.controller'
import { RoomGateway } from './room.gateway'
import { RoomActivitySchedulerService } from './room-activity-scheduler.service'

import { ShareController, SharePublicController } from './share.controller'

@Module({
  imports: [PrismaModule, CategoryModule, SocketModule, UserModule, VoteModule, MetricModule],
  controllers: [RoomController, ShareController, SharePublicController],
  providers: [RoomRepository, RoomService, RoomGateway, RoomActivitySchedulerService],
  exports: [RoomService, RoomRepository],
})
export class RoomModule {}
