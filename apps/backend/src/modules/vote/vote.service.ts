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
  VoteParticipantLeftPayload,
  VoteResettedPayload,
  VoteStartedPayload,
  VoteStatePayload,
  type VoteRunOffPayload,
  type VoteOwnerPickPayload,
} from './dto/vote.s2c.dto'

@Injectable()
export class VoteService {
  // categoryId : 투표 세션
  constructor(private readonly sessions: VoteSessionStore) {}

  /**
   * 세션 생성 또는 조회 (vote:join)
   * 방이 없으면 초기화하고, 있으면 반환
   * @param roomId 페이로드 내 카테고리 ID
   * @param userId 유저 정보
   */
  getOrCreateSession(roomId: string, userId: string): VoteStatePayload {
    if (!this.sessions.has(roomId)) {
      this.sessions.set(roomId, {
        status: VoteStatus.WAITING,
        candidates: new Map(),
        userVotes: new Map(),
        totalCounts: new Map(),
        singleVote: false,
        round: 1,
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
   * 방 삭제 시, 방에 속한 모든 카테고리 투표 세션을 제거
   * - voteRoomId 규칙: `${roomId}:${categoryId}`
   */
  deleteSessionsByRoom(roomId: string) {
    const prefix = `${roomId}:`
    for (const sessionKey of this.sessions.keys()) {
      if (sessionKey.startsWith(prefix)) {
        this.sessions.delete(sessionKey)
      }
    }
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
      round: session.round,
      singleVote: session.singleVote,
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
    session.singleVote = false
    session.round = 1

    return { status: session.status }
  }

  /**
   * 투표 마감 (vote:end)
   * 동률 감지 후 결선 투표 또는 방장 선택으로 분기
   * @param roomId 페이로드 내 카테고리 ID
   * - TODO: Gateway에 voteGuard 적용하기
   */
  endVote(roomId: string): { type: 'completed' | 'runoff' | 'owner-pick'; payload: VoteEndedPayload | VoteRunOffPayload | VoteOwnerPickPayload } {
    const session = this.getSessionOrThrow(roomId)

    if (session.status !== VoteStatus.IN_PROGRESS) {
      throw new CustomException(ErrorType.BadRequest, 'INVALID_STATUS: 진행 중인 투표만 종료할 수 있습니다.')
    }

    // 최다 득표 후보 찾기
    const tiedCandidates = this.getTiedCandidates(session)

    // 동률이 아닌 경우, 투표 정상 종료
    if (tiedCandidates.length <= 1) {
      session.status = VoteStatus.COMPLETED
      session.round = 1
      session.singleVote = false
      session.selectedCandidateId = undefined
      return {
        type: 'completed',
        payload: {
          status: 'COMPLETED',
          candidates: Array.from(session.candidates.values()),
        } as VoteEndedPayload,
      }
    }

    // 동률인 경우, 결선 투표 진행
    if (session.round === 1) {
      return {
        type: 'runoff',
        payload: this.startRunoff(roomId, session, tiedCandidates),
      }
    }

    // 결선에서 동률인 경우, 방장 최종 선택
    return {
      type: 'owner-pick',
      payload: this.startOwnerPick(session, tiedCandidates),
    }
  }

  /**
   * 결선 투표 전환: 동률 후보만 남기고 투표 리셋
   */
  private startRunoff(roomId: string, session: VoteSession, tiedCandidates: Candidate[]): VoteRunOffPayload {
    const tiedIds = new Set(tiedCandidates.map(c => c.placeId))

    // 동률 후보만 남기기
    for (const candidateId of session.candidates.keys()) {
      if (!tiedIds.has(candidateId)) {
        session.candidates.delete(candidateId)
        session.totalCounts.delete(candidateId)
      }
    }

    // 투표 기록 초기화
    session.userVotes.clear()
    for (const candidateId of session.candidates.keys()) {
      session.totalCounts.set(candidateId, 0)
    }

    session.round = 2
    session.singleVote = true

    return { tiedCandidates, round: 2, singleVote: true }
  }

  /**
   * 방장 최종 선택 전환
   */
  private startOwnerPick(session: VoteSession, tiedCandidates: Candidate[]): VoteOwnerPickPayload {
    session.status = VoteStatus.OWNER_PICK
    return { tiedCandidates, status: 'OWNER_PICK' }
  }

  /**
   * 방장 최종 선택 확정 (vote:owner-select)
   */
  ownerSelect(roomId: string, candidateId: string): VoteEndedPayload {
    const session = this.getSessionOrThrow(roomId)

    if (session.status !== VoteStatus.OWNER_PICK) {
      throw new CustomException(ErrorType.BadRequest, '방장 선택 단계가 아닙니다.')
    }

    if (!session.candidates.has(candidateId)) {
      throw new CustomException(ErrorType.NotFound, '존재하지 않는 후보입니다.')
    }

    session.status = VoteStatus.COMPLETED
    session.round = 1
    session.singleVote = false
    session.selectedCandidateId = candidateId
    return {
      status: 'COMPLETED',
      candidates: Array.from(session.candidates.values()),
      selectedCandidateId: candidateId,
    }
  }

  /**
   * 최다 득표 동률 후보 목록 반환
   */
  private getTiedCandidates(session: VoteSession): Candidate[] {
    let maxCount = 0
    for (const count of session.totalCounts.values()) {
      if (count > maxCount) maxCount = count
    }

    if (maxCount === 0) return Array.from(session.candidates.values())

    const tied: Candidate[] = []
    for (const [candidateId, count] of session.totalCounts.entries()) {
      if (count === maxCount) {
        const candidate = session.candidates.get(candidateId)
        if (candidate) tied.push(candidate)
      }
    }
    return tied
  }

  /**
   * 투표 리셋 (vote:reset)
   * - candidates는 유지
   * - status를 WAITING으로 변경
   * - userVotes와 totalCounts 초기화
   * @param roomId 페이로드 내 카테고리 ID
   */
  resetVote(roomId: string): VoteResettedPayload {
    const session = this.getSessionOrThrow(roomId)

    if (session.status !== VoteStatus.COMPLETED) {
      throw new CustomException(ErrorType.BadRequest, '완료된 투표만 리셋할 수 있습니다.')
    }

    // 리셋: candidates 유지, 나머지 초기화
    session.status = VoteStatus.WAITING
    session.userVotes.clear()
    session.totalCounts.clear()

    return {
      status: 'WAITING',
      candidates: Array.from(session.candidates.values()),
      counts: {},
      voters: {},
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

    // 결선 투표: 1인 1표 제한
    if (session.singleVote) {
      const userVotes = session.userVotes.get(userId)
      if (userVotes && userVotes.size > 0 && !userVotes.has(candidateId)) {
        throw new CustomException(ErrorType.VoteSingleVoteLimit, '결선 투표에서는 1개의 후보에만 투표할 수 있습니다.')
      }
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

  // TODO: 승자를 세션에 넣어 불필요한 계산을 개선할 여지가 있다.
  /**
   * 해당 투표 세션의 승리 후보 반환 (완료된 경우)
   * 동점자 발생 시, 동점인 모든 후보를 반환
   * @param voteRoomId 투표 룸 ID (${roomId}:${categoryId})
   */
  getWinnerCandidates(voteRoomId: string): Candidate[] {
    const session = this.sessions.get(voteRoomId)
    // 세션이 없거나 투표가 완료되지 않았으면 빈 배열 반환
    if (!session || session.status !== VoteStatus.COMPLETED) {
      return []
    }

    // 1. 방장 선택(Pick)이 있는 경우 최우선 반환
    const selectedCandidateId = session.selectedCandidateId
    if (selectedCandidateId) {
      const selected = session.candidates.get(selectedCandidateId)
      return selected ? [selected] : []
    }

    // 2. 투표 수 집계
    let maxVotes = 0
    for (const count of session.totalCounts.values()) {
      if (count > maxVotes) {
        maxVotes = count
      }
    }

    // 득표가 아예 없으면 승자 없음
    if (maxVotes === 0) {
      return []
    }

    // 3. 최다 득표자 모두 찾기 (동점자 처리)
    const winners: Candidate[] = []
    for (const candidate of session.candidates.values()) {
      const count = session.totalCounts.get(candidate.placeId) ?? 0
      if (count === maxVotes) {
        winners.push(candidate)
      }
    }

    return winners
  }

  /**
   * 특정 방의 모든 카테고리에서 사용자의 투표를 취소
   * - room 연결 해제 시 호출됨
   * - voteRoomId 규칙: `${roomId}:${categoryId}`
   * @param roomId 방 ID
   * @param userId 사용자 ID
   * @returns voteRoomId별 변경된 투표 정보 (브로드캐스트용)
   */

  revokeAllVotesForUser(roomId: string, userId: string): Array<{ voteRoomId: string; payload: VoteParticipantLeftPayload }> {
    const results: Array<{ voteRoomId: string; payload: VoteParticipantLeftPayload }> = []
    const prefix = `${roomId}:`

    for (const sessionKey of this.sessions.keys()) {
      if (!sessionKey.startsWith(prefix)) continue

      const session = this.sessions.get(sessionKey)
      if (!session) continue

      const userVotes = session.userVotes.get(userId)
      if (!userVotes || userVotes.size === 0) continue

      if (session.status !== VoteStatus.IN_PROGRESS) continue

      // 해당 사용자의 모든 투표 취소
      for (const candidateId of userVotes) {
        const currentCount = session.totalCounts.get(candidateId) || 0
        const newCount = Math.max(0, currentCount - 1)
        session.totalCounts.set(candidateId, newCount)
      }

      // 사용자의 투표 기록 삭제
      session.userVotes.delete(userId)

      // 해당 voteRoom의 전체 counts와 voters 생성
      const counts: Record<string, number> = {}
      const voters: Record<string, string[]> = {}

      for (const candidateId of session.candidates.keys()) {
        counts[candidateId] = session.totalCounts.get(candidateId) || 0
        voters[candidateId] = this.getVoterIdsForCandidate(session, candidateId)
      }

      results.push({
        voteRoomId: sessionKey,
        payload: { userId, counts, voters },
      })
    }

    return results
  }
}
