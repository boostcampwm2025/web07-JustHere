import { Module } from '@nestjs/common'
import { RoomBroadcaster } from './room.broadcaster'
import { CanvasBroadcaster } from './canvas.broadcaster'

@Module({
  providers: [RoomBroadcaster, CanvasBroadcaster],
  exports: [RoomBroadcaster, CanvasBroadcaster],
})
export class SocketModule {}
