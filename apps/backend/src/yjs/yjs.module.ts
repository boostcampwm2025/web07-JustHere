import { CanvasService } from '@/yjs/canvas.service'
import { Module } from '@nestjs/common'
import { YjsService } from './yjs.service'
import { CanvasGateway } from './canvas.gateway'
import { SocketModule } from '@/socket/socket.module'

@Module({
  imports: [SocketModule],
  providers: [YjsService, CanvasGateway, CanvasService],
  exports: [YjsService],
})
export class YjsModule {}
