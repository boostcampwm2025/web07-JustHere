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
  VoteOwnerSelectPayload,
  VoteResetPayload,
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
    // 사용자가 참여한 모든 투표 방에서 나가기
    // 카테고리 재진입 시 후보 목록 유지를 위해 세션은 삭제하지 않음
    const voteRooms = Array.from(client.rooms).filter(room => room.startsWith('vote:'))
    for (const room of voteRooms) {
      await client.leave(room)
    }
  }

  @SubscribeMessage('vote:join')
  async onVoteJoin(@ConnectedSocket() client: Socket, @MessageBody() payload: VoteJoinPayload) {
    const { roomId, categoryId, userId } = payload
    const user = this.resolveUserSession(client, roomId, userId)

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
    const { roomId, categoryId, userId } = payload
    const user = this.resolveUserSession(client, roomId, userId)

    if (!user || user.roomId !== roomId) {
      throw new CustomException(ErrorType.NotInRoom, 'Room에 접속되지 않았습니다.')
    }
    const voteRoomId = this.getVoteRoomId(roomId, categoryId)

    await client.leave(`vote:${voteRoomId}`)
  }

  @SubscribeMessage('vote:candidate:add')
  onCandidateAdd(@ConnectedSocket() client: Socket, @MessageBody() payload: VoteCandidateAddPayload) {
    const { roomId, categoryId } = payload
    const user = this.resolveUserSession(client, roomId, payload.userId)

    if (!user || user.roomId !== roomId) {
      throw new CustomException(ErrorType.NotInRoom, 'Room에 접속되지 않았습니다.')
    }

    const voteRoomId = this.getVoteRoomId(roomId, categoryId)
    const addedPayload = this.voteService.addCandidatePlace(voteRoomId, user.userId, payload)
    this.broadcaster.emitToVote(voteRoomId, 'vote:candidate:added', addedPayload)
  }

  @SubscribeMessage('vote:candidate:remove')
  onCandidateRemove(@ConnectedSocket() client: Socket, @MessageBody() payload: VoteCandidateRemovePayload) {
    const { roomId, categoryId, candidateId } = payload
    const user = this.resolveUserSession(client, roomId, payload.userId)

    if (!user || user.roomId !== roomId) {
      throw new CustomException(ErrorType.NotInRoom, 'Room에 접속되지 않았습니다.')
    }

    const voteRoomId = this.getVoteRoomId(roomId, categoryId)
    const removedPayload = this.voteService.removeCandidatePlace(voteRoomId, candidateId)
    this.broadcaster.emitToVote(voteRoomId, 'vote:candidate:removed', removedPayload)
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

    const result = this.voteService.endVote(voteRoomId)

    switch (result.type) {
      case 'completed':
        this.broadcaster.emitToVote(voteRoomId, 'vote:ended', result.payload)
        break
      case 'runoff':
        this.broadcaster.emitToVote(voteRoomId, 'vote:runoff', result.payload)
        break
      case 'owner-pick':
        this.broadcaster.emitToVote(voteRoomId, 'vote:owner-pick', result.payload)
        break
    }
  }

  @UseGuards(VoteOwnerGuard)
  @SubscribeMessage('vote:owner-select')
  onOwnerSelect(@ConnectedSocket() client: Socket, @MessageBody() payload: VoteOwnerSelectPayload) {
    const { roomId, categoryId, candidateId } = payload
    const voteRoomId = this.getVoteRoomId(roomId, categoryId)

    const endedPayload = this.voteService.ownerSelect(voteRoomId, candidateId)
    this.broadcaster.emitToVote(voteRoomId, 'vote:ended', endedPayload)
  }

  @UseGuards(VoteOwnerGuard)
  @SubscribeMessage('vote:reset')
  onResetVote(@ConnectedSocket() client: Socket, @MessageBody() payload: VoteResetPayload) {
    const { roomId, categoryId } = payload
    const voteRoomId = this.getVoteRoomId(roomId, categoryId)

    const resettedPayload = this.voteService.resetVote(voteRoomId)
    this.broadcaster.emitToVote(voteRoomId, 'vote:resetted', resettedPayload)
  }
}
