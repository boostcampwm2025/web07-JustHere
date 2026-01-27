import { Module } from '@nestjs/common'
import { RoomBroadcaster } from './room.broadcaster'
import { CanvasBroadcaster } from './canvas.broadcaster'
import { VoteBroadcaster } from './vote.broadcaster'

@Module({
  providers: [RoomBroadcaster, CanvasBroadcaster, VoteBroadcaster],
  exports: [RoomBroadcaster, CanvasBroadcaster, VoteBroadcaster],
})
export class SocketModule {}
