import { Module } from '@nestjs/common'
import { CanvasService } from './canvas.service'
import { CanvasGateway } from './canvas.gateway'
import { SocketModule } from '@/modules/socket/socket.module'
import { CanvasRepository } from './canvas.repository'

@Module({
  imports: [SocketModule],
  providers: [CanvasService, CanvasGateway, CanvasRepository],
  exports: [CanvasService],
})
export class CanvasModule {}
