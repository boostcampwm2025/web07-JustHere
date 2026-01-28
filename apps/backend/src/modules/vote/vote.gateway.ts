import { CustomException } from '@/lib/exceptions/custom.exception'
import { WebsocketExceptionsFilter } from '@/lib/filter'
import { ErrorType } from '@/lib/types/response.type'
import { UseFilters, UseGuards } from '@nestjs/common'
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
import { VoteOwnerGuard } from '@/lib/guards/vote-owner.guard'
import { VoteBroadcaster } from '@/modules/socket/vote.broadcaster'
import { UserService } from '@/modules/user/user.service'
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
    private readonly userService: UserService,
  ) {}

  afterInit(server: Server) {
    this.broadcaster.setServer(server)
  }

  async handleDisconnect(client: Socket) {
    // 사용자 세션 조회
    const userSession = this.userService.removeSession(client.id)
    if (!userSession) return

    // 사용자가 참여한 모든 투표 방에서 나가기
    const voteRooms = Array.from(client.rooms).filter(room => room.startsWith('vote:'))
    for (const room of voteRooms) {
      await client.leave(room)

      const roomClients = await this.server.in(room).fetchSockets()
      if (roomClients.length === 0) {
        this.voteService.deleteSession(room.replace('vote:', ''))
      }
    }
  }

  @SubscribeMessage('vote:join')
  async onVoteJoin(@ConnectedSocket() client: Socket, @MessageBody() payload: VoteJoinPayload) {
    const { roomId } = payload
    const user = this.userService.getSession(client.id)

    await client.join(`vote:${roomId}`)

    const statePayload = this.voteService.getOrCreateSession(roomId, user.userId)
    client.emit('vote:state', statePayload)
  }

  @SubscribeMessage('vote:leave')
  async onVoteLeave(@ConnectedSocket() client: Socket, @MessageBody() payload: VoteLeavePayload) {
    const { roomId } = payload

    await client.leave(`vote:${roomId}`)
  }

  @SubscribeMessage('vote:candidate:add')
  onCandidateAdd(@ConnectedSocket() client: Socket, @MessageBody() payload: VoteCandidateAddPayload) {
    const { roomId } = payload
    const user = this.userService.getSession(client.id)

    const updatePayload = this.voteService.addCandidatePlace(roomId, user.userId, payload)
    this.broadcaster.emitToVote(roomId, 'vote:candidate:updated', updatePayload)
  }

  @SubscribeMessage('vote:candidate:remove')
  onCandidateRemove(@ConnectedSocket() client: Socket, @MessageBody() payload: VoteCandidateRemovePayload) {
    const { roomId, candidateId } = payload
    this.userService.getSession(client.id)

    const updatePayload = this.voteService.removeCandidatePlace(roomId, candidateId)
    this.broadcaster.emitToVote(roomId, 'vote:candidate:updated', updatePayload)
  }

  @SubscribeMessage('vote:cast')
  onCastVote(@ConnectedSocket() client: Socket, @MessageBody() payload: VoteCastPayload) {
    const { roomId, candidateId } = payload
    const user = this.userService.getSession(client.id)

    if (!user || user.roomId !== roomId) {
      throw new CustomException(ErrorType.NotInRoom, 'Room에 접속되지 않았습니다.')
    }

    const updatePayload = this.voteService.castVote(roomId, user.userId, candidateId)

    this.broadcaster.emitToVote(roomId, 'vote:counts:updated', updatePayload)
  }

  @SubscribeMessage('vote:revoke')
  onRevokeVote(@ConnectedSocket() client: Socket, @MessageBody() payload: VoteRevokePayload) {
    const { roomId, candidateId } = payload
    const user = this.userService.getSession(client.id)

    if (!user || user.roomId !== roomId) {
      throw new CustomException(ErrorType.NotInRoom, 'Room에 접속되지 않았습니다.')
    }

    const updatePayload = this.voteService.revokeVote(roomId, user.userId, candidateId)

    this.broadcaster.emitToVote(roomId, 'vote:counts:updated', updatePayload)
  }

  @UseGuards(VoteOwnerGuard)
  @SubscribeMessage('vote:start')
  onStartVote(@ConnectedSocket() client: Socket, @MessageBody() payload: VoteStartPayload) {
    const { roomId } = payload

    const startedPayload = this.voteService.startVote(roomId)
    this.broadcaster.emitToVote(roomId, 'vote:started', startedPayload)
  }

  @UseGuards(VoteOwnerGuard)
  @SubscribeMessage('vote:end')
  onEndVote(@ConnectedSocket() client: Socket, @MessageBody() payload: VoteEndPayload) {
    const { roomId } = payload

    const endedPayload = this.voteService.endVote(roomId)
    this.broadcaster.emitToVote(roomId, 'vote:ended', endedPayload)
  }
}
