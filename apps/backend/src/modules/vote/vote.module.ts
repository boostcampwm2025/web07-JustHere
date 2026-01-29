import { CategoryModule } from '@/modules/category/category.module'
import { VoteController } from '@/modules/vote/vote.controller'
import { Module } from '@nestjs/common'
import { SocketModule } from '@/modules/socket/socket.module'
import { UserModule } from '@/modules/user/user.module'
import { VoteGateway } from './vote.gateway'
import { VoteService } from './vote.service'
import { VoteSessionStore } from './vote-session.store'

@Module({
  imports: [SocketModule, UserModule, CategoryModule],
  controllers: [VoteController],
  providers: [VoteGateway, VoteService, VoteSessionStore],
  exports: [VoteService],
})
export class VoteModule {}
