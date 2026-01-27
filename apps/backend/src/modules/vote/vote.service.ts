import { Injectable } from '@nestjs/common'
import type { Socket } from 'socket.io'
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
import { VoteSessionStore } from './vote-session.store'
import { UserService } from '@/modules/user/user.service'
import { VoteStatePayload } from './dto/vote.s2c.dto'
import { VoteStatus, VoteSession } from './vote.type'
import { CustomException } from '@/lib/exceptions/custom.exception'
import { ErrorType } from '@/lib/types/response.type'

@Injectable()
export class VoteService {
  constructor(
    private readonly broadcaster: VoteBroadcaster,
    private readonly sessionStore: VoteSessionStore,
    private readonly userService: UserService,
  ) {}

  addCandidate(_client: Socket, _payload: VoteCandidateAddPayload) {
    // TODO: VoteService.addCandidate 구현
  }

  removeCandidate(_client: Socket, _payload: VoteCandidateRemovePayload) {
    // TODO: VoteService.removeCandidate 구현
  }

  async joinVote(client: Socket, payload: VoteJoinPayload) {
    const { roomId: canvasId } = payload

    // 유저 정보 확인
    const userSession = this.userService.getSession(client.id)
    if (!userSession) {
      throw new CustomException(ErrorType.NotInRoom, '세션을 찾을 수 없습니다.')
    }

    // 투표 세션 조회
    const voteSession = this.getVoteSession(canvasId)

    // 소켓 room에 join
    await client.join(`vote:${canvasId}`)

    // 본인에게 vote:state 이벤트 emit
    const statePayload: VoteStatePayload = {
      status: voteSession.meta.status,
      candidates: Array.from(voteSession.data.candidates.values()),
      counts: Object.fromEntries(voteSession.aggs.totalCounts),
      myVotes: Array.from(voteSession.aggs.userVotes.get(userSession.userId) || []),
    }
    client.emit('vote:state', statePayload)
  }

  async leaveVote(client: Socket, payload?: VoteLeavePayload) {
    // TODO: disconnect 시 payload가 없을 때, 처리하기
    if (!payload) return

    const { roomId: canvasId } = payload

    await client.leave(`vote:${canvasId}`)
    this.sessionStore.delete(canvasId)
  }

  castVote(_client: Socket, _payload: VoteCastPayload) {
    // TODO: VoteService.castVote 구현
  }

  revokeVote(_client: Socket, _payload: VoteRevokePayload) {
    // TODO: VoteService.revokeVote 구현
  }

  startVote(_client: Socket, _payload: VoteStartPayload) {
    // TODO: VoteService.startVote 구현
  }

  endVote(_client: Socket, _payload: VoteEndPayload) {
    // TODO: VoteService.endVote 구현
  }

  private getVoteSession(canvasId: string): VoteSession {
    let session = this.sessionStore.get(canvasId)
    if (!session) {
      session = this.createSession(canvasId)
      this.sessionStore.set(canvasId, session)
    }

    return session
  }

  private createSession(canvasId: string): VoteSession {
    return {
      canvasId,
      meta: { status: VoteStatus.WAITING, createdAt: new Date() },
      data: {
        candidates: new Map(),
      },
      aggs: {
        totalCounts: new Map(),
        userVotes: new Map(),
      },
    }
  }
}
