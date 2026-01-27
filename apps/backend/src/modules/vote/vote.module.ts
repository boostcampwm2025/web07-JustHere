import { Module } from '@nestjs/common'
import { SocketModule } from '@/modules/socket/socket.module'
import { UserModule } from '@/modules/user/user.module'
import { VoteGateway } from './vote.gateway'
import { VoteService } from './vote.service'
import { VoteSessionStore } from './vote-session.store'

@Module({
  imports: [SocketModule, UserModule],
  providers: [VoteGateway, VoteService, VoteSessionStore],
  exports: [VoteService],
})
export class VoteModule {}
