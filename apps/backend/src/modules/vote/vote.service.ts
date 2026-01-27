import { CustomException } from '@/lib/exceptions/custom.exception'
import { ErrorType } from '@/lib/types/response.type'
import { BadRequestException, Injectable } from '@nestjs/common'
import { Candidate, PlaceData, VoteSession, VoteStatePayload, VoteStatus } from './vote.types'

@Injectable()
export class VoteService {
  // categoryId : 투표 세션
  private sessions: Map<string, VoteSession> = new Map()

  /**
   * 세션 생성 또는 조회 (vote:join)
   * 방이 없으면 초기화하고, 있으면 반환
   * @param roomId 페이로드 내 카테고리 ID
   */
  getOrCreateSession(roomId: string): VoteSession {
    if (!this.sessions.has(roomId)) {
      this.sessions.set(roomId, {
        status: VoteStatus.WAITING,
        candidates: new Map(),
        userVotes: new Map(),
      })
    }
    return this.sessions.get(roomId)!
  }

  /**
   * 세션 삭제 (vote:leave, handleDisconnect)
   * @param roomId 페이로드 내 카테고리 ID
   */
  deleteSession(roomId: string): void {
    this.sessions.delete(roomId)
  }

  /**
   * 현재 투표 상태 조회 (vote:state)
   * 득표수를 실시간으로 집계
   * @param roomId 페이로드 내 카테고리 ID
   * @param userId 소켓 세션의 userID
   */
  getVoteState(roomId: string, userId: string): VoteStatePayload {
    const session = this.getSessionOrThrow(roomId)

    // 1. 득표수 집계 (Aggregation)
    const counts: Record<string, number> = {}
    // 초기화: 모든 후보 0표
    session.candidates.forEach((_, id) => (counts[id] = 0))

    // 집계: 모든 유저의 투표 순회
    session.userVotes.forEach(userVote => {
      userVote.forEach(candidateId => {
        if (counts[candidateId] !== undefined) {
          counts[candidateId]++
        }
      })
    })

    // 2. 내 투표 목록 조회
    const myVotesSet = session.userVotes.get(userId)
    const myVotes = myVotesSet ? Array.from(myVotesSet) : []

    return {
      status: session.status,
      candidates: Array.from(session.candidates.values()),
      counts,
      myVotes,
    }
  }

  /**
   * 후보 등록 (vote:candidate:add)
   * @param roomId 페이로드 내 카테고리 ID
   * @param userId 소켓 세션의 userID
   * @param placeData 구글맵에서 받아온 장소 데이터
   */
  // TODO: 후보 리스트에 추가한 사용자가 누군지도 전달해야 하는건가?
  addCandidatePlace(roomId: string, userId: string, placeData: PlaceData): Candidate {
    const session = this.getSessionOrThrow(roomId)

    if (session.status !== VoteStatus.WAITING) {
      throw new CustomException(ErrorType.VoteAlreadyStarted, '투표가 시작되어 후보를 추가할 수 없습니다.')
    }

    // 중복 장소 체크 (PlaceId 기준)
    const isDuplicate = Array.from(session.candidates.values()).some(c => c.id === placeData.id)

    if (isDuplicate) {
      throw new CustomException(ErrorType.DuplicatedCandidate, '이미 등록된 후보 장소입니다.')
    }

    // 후보 리스트에 등록
    const newCandidate: Candidate = {
      ...placeData,
      createdBy: userId,
      createdAt: new Date(),
    }

    session.candidates.set(newCandidate.id, newCandidate)

    return newCandidate
  }

  /**
   * 후보 삭제 (vote:candidate:remove)
   * - 조건: WAITING 상태
   * @param roomId 페이로드 내 카테고리 ID
   * @param candidateId 페이로드의 placeId
   */
  removeCandidatePlace(roomId: string, candidateId: string) {
    const session = this.getSessionOrThrow(roomId)

    if (session.status !== VoteStatus.WAITING) {
      throw new CustomException(ErrorType.VoteAlreadyStarted, '투표가 시작되어 후보를 삭제할 수 없습니다.')
    }

    const candidate = session.candidates.get(candidateId)
    if (!candidate) {
      throw new CustomException(ErrorType.NotFound, '존재하지 않는 후보입니다.')
    }

    session.candidates.delete(candidateId)

    return candidateId
  }

  /**
   * 투표 시작 (vote:start)
   * - WAITING -> IN_PROGRESS
   * - TODO: Gateway에 voteGuard 적용하기
   * @param roomId 페이로드 내 카테고리 ID
   */
  startVote(roomId: string): VoteSession {
    const session = this.getSessionOrThrow(roomId)

    if (session.status !== VoteStatus.WAITING) {
      throw new CustomException(ErrorType.BadRequest, '투표를 시작할 수 없는 상태입니다.')
    }

    if (session.candidates.size === 0) {
      throw new CustomException(ErrorType.NoCandidates, '최소 1개 이상의 후보가 필요합니다.')
    }

    session.status = VoteStatus.IN_PROGRESS

    return session
  }

  /**
   * 투표 마감 (vote:end)
   * @param roomId 페이로드 내 카테고리 ID
   * - TODO: Gateway에 voteGuard 적용하기
   */
  endVote(roomId: string): VoteSession {
    const session = this.getSessionOrThrow(roomId)

    if (session.status !== VoteStatus.IN_PROGRESS) {
      throw new BadRequestException('INVALID_STATUS: 진행 중인 투표만 종료할 수 있습니다.')
    }

    session.status = VoteStatus.COMPLETED

    return session
  }

  /**
   * 투표하기 (vote:cast)
   * - 조건: IN_PROGRESS 상태
   * - 로직: 다중 투표 처리, Set을 이용해 중복 투표 방지
   * @param roomId 페이로드 내 카테고리 ID
   * @param userId 투표하는 사용자 ID (client.id의 userSessionStore에서 가져오기)
   * @param candidateId 페이로드의 placeId
   */
  // TODO : 동시성 문제 처리 해야함.
  castVote(roomId: string, userId: string, candidateId: string): void {
    const session = this.getSessionOrThrow(roomId)

    if (session.status !== VoteStatus.IN_PROGRESS) {
      throw new CustomException(ErrorType.VoteNotInProgress, '현재 투표 진행 중이 아닙니다.')
    }

    if (!session.candidates.has(candidateId)) {
      throw new CustomException(ErrorType.NotFound, '존재하지 않는 후보입니다.')
    }

    // 유저의 투표 저장소 가져오기 (없으면 생성)
    if (!session.userVotes.has(userId)) {
      session.userVotes.set(userId, new Set())
    }

    const userVotes = session.userVotes.get(userId)!

    // 투표 추가 (Set 자료구조를 활용한 중복 투표 방지)
    userVotes.add(candidateId)
  }

  /**
   * 투표했던 후보 장소에 대한 투표 취소 (vote:revoke)
   * - 조건: IN_PROGRESS 상태
   * @param roomId 페이로드 내 카테고리 ID
   * @param userId 투표하는 사용자 ID (client.id의 userSessionStore에서 가져오기)
   * @param candidateId 페이로드의 placeId
   */
  revokeVote(roomId: string, userId: string, candidateId: string): void {
    const session = this.getSessionOrThrow(roomId)

    if (session.status !== VoteStatus.IN_PROGRESS) {
      throw new CustomException(ErrorType.VoteNotInProgress, '현재 투표 진행 중이 아닙니다.')
    }

    const userVotes = session.userVotes.get(userId)
    if (userVotes) {
      userVotes.delete(candidateId)
    }
  }

  // TODO: 살릴까? 말까?
  /**
   * 투표 삭제 or 취소 (vote:delete)
   * - 진행 중에도 강제 취소 가능 (후보 리스트 단계로 초기화)
   * - TODO: Gateway에 voteGuard 적용하기
   * @param roomId 페이로드 내 카테고리 ID
   */
  resetVote(roomId: string): void {
    const session = this.getSessionOrThrow(roomId)

    session.status = VoteStatus.WAITING
    session.userVotes.clear()
  }

  /**
   * 투표 세션 조회
   * @param roomId 페이로드 내 카테고리 ID
   */
  getSessionOrThrow(roomId: string): VoteSession {
    const session = this.sessions.get(roomId)
    if (!session) {
      throw new CustomException(ErrorType.NotFound, '투표 세션이 존재하지 않습니다.')
    }
    return session
  }

  /**
   * 후보 리스트 반환 (vote:candidate:updated 반환값.)
   * @param roomId 페이로드 내 카테고리 ID
   */
  getCandidates(roomId: string): Candidate[] {
    const session = this.sessions.get(roomId)
    if (!session) {
      throw new CustomException(ErrorType.NotFound, '투표 세션이 존재하지 않습니다.')
    }

    return Array.from(session.candidates.values())
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
import { VoteStatePayload, VoteStartedPayload, VoteEndedPayload, VoteCandidateUpdatedPayload, VoteMeUpdatedPayload } from './dto/vote.s2c.dto'
import { VoteStatus, VoteSession, VoteCandidate } from './vote.type'
import { CustomException } from '@/lib/exceptions/custom.exception'
import { ErrorType } from '@/lib/types/response.type'

@Injectable()
export class VoteService {
  constructor(
    private readonly broadcaster: VoteBroadcaster,
    private readonly sessionStore: VoteSessionStore,
    private readonly userService: UserService,
  ) {}

  addCandidate(client: Socket, payload: VoteCandidateAddPayload) {
    // TODO: VoteService.addCandidate 구현
    const candidate: VoteCandidate = { id: '1', placeId: '1', name: 'test', address: 'test', createdBy: '1', createdAt: new Date() }
    const updatePayload: VoteCandidateUpdatedPayload = {
      action: 'add',
      candidate,
    }

    this.broadcaster.emitToCanvas(payload.roomId, 'vote:candidate:updated', updatePayload)
  }

  removeCandidate(client: Socket, payload: VoteCandidateRemovePayload) {
    // TODO: VoteService.removeCandidate 구현
    const updatePayload: VoteCandidateUpdatedPayload = {
      action: 'remove',
      candidateId: payload.candidateId,
    }

    this.broadcaster.emitToCanvas(payload.roomId, 'vote:candidate:updated', updatePayload)
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

  castVote(client: Socket, payload: VoteCastPayload) {
    // TODO: VoteService.castVote 구현

    // vote:counts:updated 브로드캐스트
    this.broadcaster.emitToCanvas(payload.roomId, 'vote:counts:updated', {
      candidateId: payload.candidateId,
      count: 0,
    })

    // 본인에게 vote:me:updated 이벤트 emit
    const myVotes = []
    const mePayload: VoteMeUpdatedPayload = {
      myVotes,
    }
    client.emit('vote:me:updated', mePayload)
  }

  revokeVote(client: Socket, payload: VoteRevokePayload) {
    // TODO: VoteService.revokeVote 구현

    // vote:counts:updated 브로드캐스트
    this.broadcaster.emitToCanvas(payload.roomId, 'vote:counts:updated', {
      candidateId: payload.candidateId,
      count: 0,
    })

    // 본인에게 vote:me:updated 이벤트 emit
    const myVotes = []
    const mePayload: VoteMeUpdatedPayload = {
      myVotes,
    }
    client.emit('vote:me:updated', mePayload)
  }

  startVote(client: Socket, payload: VoteStartPayload) {
    // TODO: VoteService.startVote 구현

    // vote:started 브로드캐스트
    const startedPayload: VoteStartedPayload = {
      status: 'IN_PROGRESS',
    }
    this.broadcaster.emitToCanvas(payload.roomId, 'vote:started', startedPayload)
  }

  endVote(client: Socket, payload: VoteEndPayload) {
    // TODO: VoteService.endVote 구현

    // vote:ended 브로드캐스트
    const endedPayload: VoteEndedPayload = {
      status: 'COMPLETED',
      finalResults: [],
    }
    this.broadcaster.emitToCanvas(payload.roomId, 'vote:ended', endedPayload)
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
