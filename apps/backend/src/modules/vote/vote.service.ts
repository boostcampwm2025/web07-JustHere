import { Injectable } from '@nestjs/common'
import type { Socket } from 'socket.io'
import { VoteBroadcaster } from '@/modules/socket/vote.broadcaster'
import {
  VoteCandidateAddPayload,
  VoteCandidateRemovePayload,
  VoteCastPayload,
  VoteRevokePayload,
  VoteStartPayload,
  VoteEndPayload,
} from './dto/vote.c2s.dto'

@Injectable()
export class VoteService {
  constructor(private readonly broadcaster: VoteBroadcaster) {}

  addCandidate(_client: Socket, _payload: VoteCandidateAddPayload) {
    // TODO: VoteService.addCandidate 구현
  }

  removeCandidate(_client: Socket, _payload: VoteCandidateRemovePayload) {
    // TODO: VoteService.removeCandidate 구현
  }

  leaveVote(_client: Socket) {
    // TODO: VoteService.leaveVote 구현
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
}
