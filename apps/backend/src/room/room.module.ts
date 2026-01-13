import { Module } from '@nestjs/common'
import { PrismaModule } from '@/prisma/prisma.module'
import { RoomService } from './room.service'
import { RoomRepository } from './room.repository'
import { RoomController } from './room.controller'

@Module({
  imports: [PrismaModule],
  controllers: [RoomController],
  providers: [RoomService, RoomRepository],
  exports: [RoomService],
})
export class RoomModule {}
