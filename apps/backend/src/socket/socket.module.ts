import { Module } from '@nestjs/common'
import { SocketBroadcaster } from './socket.broadcaster'
import { CanvasBroadcaster } from './canvas.broadcaster'

@Module({
  providers: [SocketBroadcaster, CanvasBroadcaster],
  exports: [SocketBroadcaster, CanvasBroadcaster],
})
export class SocketModule {}
