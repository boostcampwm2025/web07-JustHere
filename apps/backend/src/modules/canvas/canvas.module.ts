import { Module } from '@nestjs/common'
import { YjsService } from './yjs.service'
import { CanvasGateway } from './canvas.gateway'
import { SocketModule } from '@/modules/socket/socket.module'
import { CanvasRepository } from './canvas.repository'

@Module({
  imports: [SocketModule],
  providers: [YjsService, CanvasGateway, CanvasRepository],
  exports: [YjsService],
})
export class CanvasModule {}
