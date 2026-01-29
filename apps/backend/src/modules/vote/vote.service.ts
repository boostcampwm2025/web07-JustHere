import { Injectable } from '@nestjs/common'
import { CustomException } from '@/lib/exceptions/custom.exception'
import { ErrorType } from '@/lib/types/response.type'
import { Candidate, PlaceData, VoteSession, VoteStatus } from './vote.types'
import { VoteSessionStore } from './vote-session.store'
import {
  VoteCandidateAddedPayload,
  VoteCandidateRemovedPayload,
  VoteCountsUpdatedPayload,
  VoteEndedPayload,
  VoteMeUpdatedPayload,
  VoteStartedPayload,
  VoteStatePayload,
} from './dto/vote.s2c.dto'

@Injectable()
export class VoteService {
  // categoryId : 투표 세션
  constructor(private readonly sessions: VoteSessionStore) {}

  /**
   * 세션 생성 또는 조회 (vote:join)
   * 방이 없으면 초기화하고, 있으면 반환
   * @param roomId 페이로드 내 카테고리 ID
   */
  getOrCreateSession(roomId: string, userId: string): VoteStatePayload {
    if (!this.sessions.has(roomId)) {
      this.sessions.set(roomId, {
        status: VoteStatus.WAITING,
        candidates: new Map(),
        userVotes: new Map(),
        totalCounts: new Map(),
      })
    }

    return this.getVoteState(roomId, userId)
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
    const myVotesSet = session.userVotes.get(userId)

    return {
      status: session.status,
      candidates: Array.from(session.candidates.values()),
      counts: Object.fromEntries(session.totalCounts.entries()),
      myVotes: myVotesSet ? Array.from(myVotesSet) : [],
      voters: this.getVoterIdsByCandidate(session),
    }
  }

  /**
   * 후보 등록 (vote:candidate:add)
   * @param roomId 페이로드 내 카테고리 ID
   * @param userId 소켓 세션의 userID
   * @param placeData 구글맵에서 받아온 장소 데이터
   */
  // TODO: 후보 리스트에 추가한 사용자가 누군지도 전달해야 하는건가?
  addCandidatePlace(roomId: string, userId: string, placeData: PlaceData): VoteCandidateAddedPayload {
    const session = this.getSessionOrThrow(roomId)

    if (session.status !== VoteStatus.WAITING) {
      throw new CustomException(ErrorType.VoteAlreadyStarted, '투표가 시작되어 후보를 추가할 수 없습니다.')
    }

    // 중복 장소 체크 (PlaceId 기준)
    if (session.candidates.has(placeData.placeId)) {
      throw new CustomException(ErrorType.DuplicatedCandidate, '이미 등록된 후보 장소입니다.')
    }

    // 후보 리스트에 등록
    const candidate: Candidate = {
      ...placeData,
      createdBy: userId,
      createdAt: new Date(),
    }

    session.candidates.set(candidate.placeId, candidate)

    return { candidate }
  }

  /**
   * 후보 삭제 (vote:candidate:remove)
   * - 조건: WAITING 상태
   * @param roomId 페이로드 내 카테고리 ID
   * @param candidateId 페이로드의 placeId
   */
  removeCandidatePlace(roomId: string, candidateId: string): VoteCandidateRemovedPayload {
    const session = this.getSessionOrThrow(roomId)

    if (session.status !== VoteStatus.WAITING) {
      throw new CustomException(ErrorType.VoteAlreadyStarted, '투표가 시작되어 후보를 삭제할 수 없습니다.')
    }

    const candidate = session.candidates.get(candidateId)
    if (!candidate) {
      throw new CustomException(ErrorType.NotFound, '존재하지 않는 후보입니다.')
    }

    session.candidates.delete(candidateId)
    session.totalCounts.delete(candidateId)

    for (const userVotesSet of session.userVotes.values()) {
      userVotesSet.delete(candidateId)
    }

    return { candidate }
  }

  /**
   * 투표 시작 (vote:start)
   * - WAITING -> IN_PROGRESS
   * - TODO: Gateway에 voteGuard 적용하기
   * @param roomId 페이로드 내 카테고리 ID
   */
  startVote(roomId: string): VoteStartedPayload {
    const session = this.getSessionOrThrow(roomId)

    if (session.status !== VoteStatus.WAITING) {
      throw new CustomException(ErrorType.BadRequest, '투표를 시작할 수 없는 상태입니다.')
    }

    if (session.candidates.size === 0) {
      throw new CustomException(ErrorType.NoCandidates, '최소 1개 이상의 후보가 필요합니다.')
    }

    session.status = VoteStatus.IN_PROGRESS

    return { status: session.status }
  }

  /**
   * 투표 마감 (vote:end)
   * @param roomId 페이로드 내 카테고리 ID
   * - TODO: Gateway에 voteGuard 적용하기
   */
  endVote(roomId: string): VoteEndedPayload {
    const session = this.getSessionOrThrow(roomId)

    if (session.status !== VoteStatus.IN_PROGRESS) {
      throw new CustomException(ErrorType.BadRequest, 'INVALID_STATUS: 진행 중인 투표만 종료할 수 있습니다.')
    }

    session.status = VoteStatus.COMPLETED

    const candidates: Candidate[] = Array.from(session.candidates.values())

    return {
      status: VoteStatus.COMPLETED,
      candidates,
    }
  }

  /**
   * 투표하기 (vote:cast)
   * - 조건: IN_PROGRESS 상태
   * - 로직: 다중 투표 처리, Set을 이용해 중복 투표 방지
   * @param roomId 페이로드 내 카테고리 ID
   * @param userId 투표하는 사용자 ID (client.id의 userSessionStore에서 가져오기)
   * @param candidateId 페이로드의 placeId
   * @returns 투표 결과와 변경 여부
   */
  // TODO : 동시성 문제 처리 해야함.
  castVote(roomId: string, userId: string, candidateId: string): VoteCountsUpdatedPayload & { changed: boolean } {
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
    // 이미 투표한 경우 바로 리턴
    if (userVotes.has(candidateId)) {
      return {
        candidateId,
        count: session.totalCounts.get(candidateId) || 0,
        userId,
        voters: this.getVoterIdsForCandidate(session, candidateId),
        changed: false,
      }
    }

    userVotes.add(candidateId)
    session.totalCounts.set(candidateId, (session.totalCounts.get(candidateId) || 0) + 1)

    return {
      candidateId,
      count: session.totalCounts.get(candidateId) || 0,
      userId,
      voters: this.getVoterIdsForCandidate(session, candidateId),
      changed: true,
    }
  }

  /**
   * 투표했던 후보 장소에 대한 투표 취소 (vote:revoke)
   * - 조건: IN_PROGRESS 상태
   * @param roomId 페이로드 내 카테고리 ID
   * @param userId 투표하는 사용자 ID (client.id의 userSessionStore에서 가져오기)
   * @param candidateId 페이로드의 placeId
   * @returns 투표 결과와 변경 여부
   */
  revokeVote(roomId: string, userId: string, candidateId: string): VoteCountsUpdatedPayload & { changed: boolean } {
    const session = this.getSessionOrThrow(roomId)

    if (session.status !== VoteStatus.IN_PROGRESS) {
      throw new CustomException(ErrorType.VoteNotInProgress, '현재 투표 진행 중이 아닙니다.')
    }

    if (!session.candidates.has(candidateId)) {
      throw new CustomException(ErrorType.NotFound, '존재하지 않는 후보입니다.')
    }

    const userVotes = session.userVotes.get(userId)

    // 투표하지 않은 경우 바로 리턴
    if (!userVotes || !userVotes.has(candidateId)) {
      return {
        candidateId,
        count: session.totalCounts.get(candidateId) || 0,
        userId,
        voters: this.getVoterIdsForCandidate(session, candidateId),
        changed: false,
      }
    }

    userVotes.delete(candidateId)

    // 투표 득표수 감소
    const current = session.totalCounts.get(candidateId) || 0
    session.totalCounts.set(candidateId, Math.max(0, current - 1))

    return {
      candidateId,
      count: session.totalCounts.get(candidateId) || 0,
      userId,
      voters: this.getVoterIdsForCandidate(session, candidateId),
      changed: true,
    }
  }

  /**
   * 사용자의 현재 투표 목록 조회
   * @param roomId 페이로드 내 카테고리 ID
   * @param userId 사용자 ID
   */
  getMyVotes(roomId: string, userId: string): VoteMeUpdatedPayload {
    const session = this.getSessionOrThrow(roomId)
    const myVotesSet = session.userVotes.get(userId)

    return { myVotes: myVotesSet ? Array.from(myVotesSet) : [] }
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

  private getVoterIdsByCandidate(session: VoteSession): Record<string, string[]> {
    const voters: Record<string, string[]> = {}

    for (const candidateId of session.candidates.keys()) {
      voters[candidateId] = []
    }

    for (const [userId, userVotes] of session.userVotes.entries()) {
      for (const candidateId of userVotes) {
        if (!session.candidates.has(candidateId)) continue
        if (!voters[candidateId]) {
          voters[candidateId] = []
        }
        voters[candidateId].push(userId)
      }
    }

    return voters
  }

  private getVoterIdsForCandidate(session: VoteSession, candidateId: string): string[] {
    if (!session.candidates.has(candidateId)) {
      return []
    }

    const voters: string[] = []
    for (const [userId, userVotes] of session.userVotes.entries()) {
      if (userVotes.has(candidateId)) {
        voters.push(userId)
      }
    }

    return voters
  }
}
