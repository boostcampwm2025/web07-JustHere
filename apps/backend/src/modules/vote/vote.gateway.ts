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

  private getVoteRoomId(roomId: string, categoryId: string) {
    return `${roomId}:${categoryId}`
  }

  private resolveUserSession(client: Socket, roomId: string, payloadUserId?: string) {
    const dataUserId = (() => {
      const data = client.data as { userId?: unknown } | undefined
      if (!data) return undefined
      return typeof data.userId === 'string' ? data.userId : undefined
    })()

    if (dataUserId) {
      if (payloadUserId && payloadUserId !== dataUserId) {
        return undefined
      }

      return this.userService.getSessionByUserIdInRoom(roomId, dataUserId)
    }

    if (payloadUserId) {
      return this.userService.getSessionByUserIdInRoom(roomId, payloadUserId)
    }

    const session = this.userService.getSession(client.id)
    if (!session || session.roomId !== roomId) return undefined
    return session
  }

  async handleDisconnect(client: Socket) {
    const namespace = this.server ?? client.nsp
    if (!namespace) return

    // 사용자가 참여한 모든 투표 방에서 나가기
    const voteRooms = Array.from(client.rooms).filter(room => room.startsWith('vote:'))
    for (const room of voteRooms) {
      await client.leave(room)

      const roomClients = await namespace.in(room).fetchSockets()
      if (roomClients.length === 0) {
        this.voteService.deleteSession(room.replace('vote:', ''))
      }
    }
  }

  @SubscribeMessage('vote:join')
  async onVoteJoin(@ConnectedSocket() client: Socket, @MessageBody() payload: VoteJoinPayload) {
    const { roomId, categoryId } = payload
    const user = this.resolveUserSession(client, roomId, payload.userId)

    if (!user || user.roomId !== roomId) {
      throw new CustomException(ErrorType.NotInRoom, 'Room에 접속되지 않았습니다.')
    }

    const voteRoomId = this.getVoteRoomId(roomId, categoryId)
    await client.join(`vote:${voteRoomId}`)
    const socketData = client.data as { userId?: string }
    socketData.userId = user.userId

    const statePayload = this.voteService.getOrCreateSession(voteRoomId, user.userId)
    client.emit('vote:state', statePayload)
  }

  @SubscribeMessage('vote:leave')
  async onVoteLeave(@ConnectedSocket() client: Socket, @MessageBody() payload: VoteLeavePayload) {
    const { roomId, categoryId } = payload
    const voteRoomId = this.getVoteRoomId(roomId, categoryId)

    await client.leave(`vote:${voteRoomId}`)

    const namespace = this.server ?? client.nsp
    if (!namespace) return

    const roomClients = await namespace.in(`vote:${voteRoomId}`).fetchSockets()
    if (roomClients.length === 0) {
      this.voteService.deleteSession(voteRoomId)
    }
  }

  @SubscribeMessage('vote:candidate:add')
  onCandidateAdd(@ConnectedSocket() client: Socket, @MessageBody() payload: VoteCandidateAddPayload) {
    const { roomId, categoryId } = payload
    const user = this.resolveUserSession(client, roomId, payload.userId)

    if (!user || user.roomId !== roomId) {
      throw new CustomException(ErrorType.NotInRoom, 'Room에 접속되지 않았습니다.')
    }

    const voteRoomId = this.getVoteRoomId(roomId, categoryId)
    const updatePayload = this.voteService.addCandidatePlace(voteRoomId, user.userId, payload)
    this.broadcaster.emitToVote(voteRoomId, 'vote:candidate:updated', updatePayload)
  }

  @SubscribeMessage('vote:candidate:remove')
  onCandidateRemove(@ConnectedSocket() client: Socket, @MessageBody() payload: VoteCandidateRemovePayload) {
    const { roomId, categoryId, candidateId } = payload
    const user = this.resolveUserSession(client, roomId, payload.userId)

    if (!user || user.roomId !== roomId) {
      throw new CustomException(ErrorType.NotInRoom, 'Room에 접속되지 않았습니다.')
    }

    const voteRoomId = this.getVoteRoomId(roomId, categoryId)
    const updatePayload = this.voteService.removeCandidatePlace(voteRoomId, candidateId)
    this.broadcaster.emitToVote(voteRoomId, 'vote:candidate:updated', updatePayload)
  }

  @SubscribeMessage('vote:cast')
  onCastVote(@ConnectedSocket() client: Socket, @MessageBody() payload: VoteCastPayload) {
    const { roomId, categoryId, candidateId } = payload
    const user = this.resolveUserSession(client, roomId, payload.userId)

    if (!user || user.roomId !== roomId) {
      throw new CustomException(ErrorType.NotInRoom, 'Room에 접속되지 않았습니다.')
    }

    const voteRoomId = this.getVoteRoomId(roomId, categoryId)
    const { changed, ...countsPayload } = this.voteService.castVote(voteRoomId, user.userId, candidateId)
    this.broadcaster.emitToVote(voteRoomId, 'vote:counts:updated', countsPayload)

    if (changed) {
      const meUpdatedPayload = this.voteService.getMyVotes(voteRoomId, user.userId)
      client.emit('vote:me:updated', meUpdatedPayload)
    }
  }

  @SubscribeMessage('vote:revoke')
  onRevokeVote(@ConnectedSocket() client: Socket, @MessageBody() payload: VoteRevokePayload) {
    const { roomId, categoryId, candidateId } = payload
    const user = this.resolveUserSession(client, roomId, payload.userId)

    if (!user || user.roomId !== roomId) {
      throw new CustomException(ErrorType.NotInRoom, 'Room에 접속되지 않았습니다.')
    }

    const voteRoomId = this.getVoteRoomId(roomId, categoryId)
    const { changed, ...countsPayload } = this.voteService.revokeVote(voteRoomId, user.userId, candidateId)
    this.broadcaster.emitToVote(voteRoomId, 'vote:counts:updated', countsPayload)

    if (changed) {
      const meUpdatedPayload = this.voteService.getMyVotes(voteRoomId, user.userId)
      client.emit('vote:me:updated', meUpdatedPayload)
    }
  }

  @UseGuards(VoteOwnerGuard)
  @SubscribeMessage('vote:start')
  onStartVote(@ConnectedSocket() client: Socket, @MessageBody() payload: VoteStartPayload) {
    const { roomId, categoryId } = payload
    const voteRoomId = this.getVoteRoomId(roomId, categoryId)

    const startedPayload = this.voteService.startVote(voteRoomId)
    this.broadcaster.emitToVote(voteRoomId, 'vote:started', startedPayload)
  }

  @UseGuards(VoteOwnerGuard)
  @SubscribeMessage('vote:end')
  onEndVote(@ConnectedSocket() client: Socket, @MessageBody() payload: VoteEndPayload) {
    const { roomId, categoryId } = payload
    const voteRoomId = this.getVoteRoomId(roomId, categoryId)

    const endedPayload = this.voteService.endVote(voteRoomId)
    this.broadcaster.emitToVote(voteRoomId, 'vote:ended', endedPayload)
  }
}
