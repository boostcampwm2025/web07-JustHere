import { Module } from '@nestjs/common'
import { AppController } from '@/app.controller'
import { AppService } from '@/app.service'
import { PrismaModule } from '@/prisma/prisma.module'
import { SocketModule } from '@/socket/socket.module'
import { YjsModule } from '@/yjs/yjs.module'

@Module({
  imports: [PrismaModule, SocketModule, YjsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
