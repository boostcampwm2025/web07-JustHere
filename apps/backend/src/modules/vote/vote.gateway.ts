import { WebsocketExceptionsFilter } from '@/lib/filter'
import { UseFilters } from '@nestjs/common'
import { WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayDisconnect } from '@nestjs/websockets'
import { Server } from 'socket.io'
import { VoteBroadcaster } from '@/modules/socket/vote.broadcaster'

@WebSocketGateway({
  namespace: '/vote',
  cors: { origin: '*' },
})
@UseFilters(new WebsocketExceptionsFilter('vote'))
export class VoteGateway implements OnGatewayInit, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  constructor(private readonly broadcaster: VoteBroadcaster) {}

  afterInit(server: Server) {
    this.broadcaster.setServer(server)
  }

  async handleDisconnect() {
    // TODO: VoteService.leaveVote 구현 후 연결
  }
}
