import { Module } from '@nestjs/common'
import { YjsService } from './yjs.service'
import { CanvasGateway } from './canvas.gateway'
import { SocketModule } from '@/modules/socket/socket.module'

@Module({
  imports: [SocketModule],
  providers: [YjsService, CanvasGateway],
  exports: [YjsService],
})
export class YjsModule {}
