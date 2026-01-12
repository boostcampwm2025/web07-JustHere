import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { RoomService } from './room.service';
import { RoomGateway } from './room.gateway';
import { UserSessionStore } from './user-session.store';

@Module({
  imports: [PrismaModule],
  providers: [RoomService, UserSessionStore, RoomGateway],
  exports: [RoomService],
})
export class RoomModule {}
