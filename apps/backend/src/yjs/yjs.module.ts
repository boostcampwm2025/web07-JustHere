import { Module } from '@nestjs/common'
import { YjsService } from './yjs.service'
import { CategoryGateway } from './yjs.gateway'
import { SocketModule } from '@/socket/socket.module'

@Module({
  imports: [SocketModule],
  providers: [YjsService, CategoryGateway],
  exports: [YjsService],
})
export class YjsModule {}
