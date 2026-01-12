import { Module } from '@nestjs/common';
import { RoomService } from './room.service';
import { RoomGateway } from './room.gateway';
import { UserSessionStore } from './user-session.store';

@Module({
  providers: [RoomService, UserSessionStore, RoomGateway],
  exports: [RoomService],
})
export class RoomModule {}
