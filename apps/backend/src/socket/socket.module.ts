import { Module } from '@nestjs/common'
import { SocketBroadcaster } from './socket.broadcaster'

@Module({
  providers: [SocketBroadcaster],
  exports: [SocketBroadcaster],
})
export class SocketModule {}
