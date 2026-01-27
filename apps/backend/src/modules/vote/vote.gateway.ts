import { WebsocketExceptionsFilter } from '@/lib/filter'
import { UseFilters } from '@nestjs/common'
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { VoteBroadcaster } from '@/modules/socket/vote.broadcaster'
import {
  VoteJoinPayload,
  VoteLeavePayload,
  VoteCandidateAddPayload,
  VoteCandidateRemovePayload,
  VoteCastPayload,
  VoteRevokePayload,
  VoteStartPayload,
  VoteEndPayload,
} from './dto/vote.c2s.dto'
import { VoteService } from './vote.service'

@WebSocketGateway({
  namespace: '/vote',
  cors: { origin: '*' },
})
@UseFilters(new WebsocketExceptionsFilter('vote'))
export class VoteGateway implements OnGatewayInit, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  constructor(
    private readonly broadcaster: VoteBroadcaster,
    private readonly voteService: VoteService,
  ) {}

  afterInit(server: Server) {
    this.broadcaster.setServer(server)
  }

  async handleDisconnect(client: Socket) {
    await this.voteService.leaveVote(client)
  }

  @SubscribeMessage('vote:join')
  async onVoteJoin(@ConnectedSocket() client: Socket, @MessageBody() payload: VoteJoinPayload) {
    await this.voteService.joinVote(client, payload)
  }

  @SubscribeMessage('vote:leave')
  async onVoteLeave(@ConnectedSocket() client: Socket, @MessageBody() payload: VoteLeavePayload) {
    await this.voteService.leaveVote(client, payload)
  }

  @SubscribeMessage('vote:candidate:add')
  onCandidateAdd(@ConnectedSocket() client: Socket, @MessageBody() payload: VoteCandidateAddPayload) {
    this.voteService.addCandidate(client, payload)
  }

  @SubscribeMessage('vote:candidate:remove')
  onCandidateRemove(@ConnectedSocket() client: Socket, @MessageBody() payload: VoteCandidateRemovePayload) {
    this.voteService.removeCandidate(client, payload)
  }

  @SubscribeMessage('vote:cast')
  onCastVote(@ConnectedSocket() client: Socket, @MessageBody() payload: VoteCastPayload) {
    this.voteService.castVote(client, payload)
  }

  @SubscribeMessage('vote:revoke')
  onRevokeVote(@ConnectedSocket() client: Socket, @MessageBody() payload: VoteRevokePayload) {
    this.voteService.revokeVote(client, payload)
  }

  @SubscribeMessage('vote:start')
  onStartVote(@ConnectedSocket() client: Socket, @MessageBody() payload: VoteStartPayload) {
    this.voteService.startVote(client, payload)
  }

  @SubscribeMessage('vote:end')
  onEndVote(@ConnectedSocket() client: Socket, @MessageBody() payload: VoteEndPayload) {
    this.voteService.endVote(client, payload)
  }
}
