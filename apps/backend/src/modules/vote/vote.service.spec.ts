import { Test, TestingModule } from '@nestjs/testing'
import { CustomException } from '@/lib/exceptions/custom.exception'
import { ErrorType } from '@/lib/types/response.type'
import { VoteService } from './vote.service'
import { VoteSessionStore } from './vote-session.store'
import { VoteStatus, PlaceData } from './vote.types'

// 테스트용 더미 데이터
const mockPlaceData: PlaceData = {
  placeId: 'place-123',
  name: 'Test Place',
  address: 'Test Address',
  category: 'Food',
  phone: '010-1234-5678',
}

describe('VoteService', () => {
  let service: VoteService
  const roomId = 'room-abc'
  const userId = 'user-1'
  const userId2 = 'user-2'

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VoteService, VoteSessionStore],
    }).compile()

    service = module.get<VoteService>(VoteService)
  })

  describe('Session Management', () => {
    it('세션이 없으면 새로 생성해야 한다', () => {
      const state = service.getOrCreateSession(roomId, userId)
      expect(state).toBeDefined()
      expect(state.status).toBe(VoteStatus.WAITING)
      expect(state.candidates).toEqual([])
      expect(state.counts).toEqual({})
      expect(state.myVotes).toEqual([])
    })

    it('이미 세션이 있으면 기존 세션 상태를 반환해야 한다', () => {
      service.getOrCreateSession(roomId, userId)
      const session = service.getSessionOrThrow(roomId)
      session.status = VoteStatus.IN_PROGRESS // 상태 변경

      const state2 = service.getOrCreateSession(roomId, userId)
      expect(state2.status).toBe(VoteStatus.IN_PROGRESS) // 변경된 상태 유지 확인
    })

    it('세션을 삭제할 수 있어야 한다', () => {
      service.getOrCreateSession(roomId, userId)
      service.deleteSession(roomId)

      // getSessionOrThrow 호출 시 예외 발생해야 함
      expect(() => service.getSessionOrThrow(roomId)).toThrow(CustomException)
    })
  })

  describe('Candidate Management', () => {
    beforeEach(() => {
      service.getOrCreateSession(roomId, userId)
    })

    it('WAITING 상태에서 후보를 등록할 수 있어야 한다', () => {
      const result = service.addCandidatePlace(roomId, userId, mockPlaceData)

      expect(result).toBeDefined()
      expect(result.candidate).toBeDefined()
      expect(result.candidate.placeId).toBe(mockPlaceData.placeId)
      expect(result.candidate.name).toBe(mockPlaceData.name)
      expect(result.candidate.createdBy).toBe(userId)
      expect(result.candidate.createdAt).toBeInstanceOf(Date)

      const session = service.getSessionOrThrow(roomId)
      expect(session.candidates.has(mockPlaceData.placeId)).toBe(true)
    })

    it('중복된 후보(같은 ID) 등록 시 예외를 던져야 한다', () => {
      service.addCandidatePlace(roomId, userId, mockPlaceData)

      expect(() => {
        service.addCandidatePlace(roomId, userId, mockPlaceData)
      }).toThrow(CustomException)

      try {
        service.addCandidatePlace(roomId, userId, mockPlaceData)
      } catch (e) {
        expect(e).toBeInstanceOf(CustomException)
        expect((e as CustomException).type).toBe(ErrorType.DuplicatedCandidate)
      }
    })

    it('투표가 시작된 후(IN_PROGRESS)에는 후보를 등록할 수 없다', () => {
      service.addCandidatePlace(roomId, userId, mockPlaceData)
      service.startVote(roomId) // WAITING -> IN_PROGRESS

      const newPlaceData: PlaceData = { ...mockPlaceData, placeId: 'place-456' }
      expect(() => {
        service.addCandidatePlace(roomId, userId, newPlaceData)
      }).toThrow(CustomException)

      try {
        service.addCandidatePlace(roomId, userId, newPlaceData)
      } catch (e) {
        expect((e as CustomException).type).toBe(ErrorType.VoteAlreadyStarted)
      }
    })

    it('후보를 삭제할 수 있어야 한다', () => {
      service.addCandidatePlace(roomId, userId, mockPlaceData)
      const result = service.removeCandidatePlace(roomId, mockPlaceData.placeId)

      expect(result).toBeDefined()
      expect(result.candidate).toBeDefined()
      expect(result.candidate.placeId).toBe(mockPlaceData.placeId)
      const session = service.getSessionOrThrow(roomId)
      expect(session.candidates.has(mockPlaceData.placeId)).toBe(false)
    })

    it('존재하지 않는 후보를 삭제하면 예외를 던져야 한다', () => {
      expect(() => {
        service.removeCandidatePlace(roomId, 'non-existent')
      }).toThrow(CustomException)

      try {
        service.removeCandidatePlace(roomId, 'non-existent')
      } catch (e) {
        expect((e as CustomException).type).toBe(ErrorType.NotFound)
      }
    })

    it('IN_PROGRESS 상태에서는 후보를 삭제할 수 없다', () => {
      service.addCandidatePlace(roomId, userId, mockPlaceData)
      service.startVote(roomId)

      expect(() => {
        service.removeCandidatePlace(roomId, mockPlaceData.placeId)
      }).toThrow(CustomException)

      try {
        service.removeCandidatePlace(roomId, mockPlaceData.placeId)
      } catch (e) {
        expect((e as CustomException).type).toBe(ErrorType.VoteAlreadyStarted)
      }
    })
  })

  describe('Voting Process', () => {
    beforeEach(() => {
      service.getOrCreateSession(roomId, userId)
      service.addCandidatePlace(roomId, userId, mockPlaceData)
      service.startVote(roomId) // 상태: IN_PROGRESS
    })

    it('IN_PROGRESS 상태에서 투표(castVote)가 가능해야 한다', () => {
      const result = service.castVote(roomId, userId, mockPlaceData.placeId)

      expect(result.candidateId).toBe(mockPlaceData.placeId)
      expect(result.userId).toBe(userId)
      expect(result.count).toBe(1)

      const state = service.getVoteState(roomId, userId)
      expect(state.counts[mockPlaceData.placeId]).toBe(1)
      expect(state.myVotes).toContain(mockPlaceData.placeId)
    })

    it('여러 유저가 투표하면 집계가 정확해야 한다', () => {
      service.castVote(roomId, userId, mockPlaceData.placeId)
      service.castVote(roomId, userId2, mockPlaceData.placeId)

      const state = service.getVoteState(roomId, userId)
      expect(state.counts[mockPlaceData.placeId]).toBe(2)
    })

    it('한 유저가 같은 후보에 여러 번 투표해도 1표만 인정되어야 한다 (Set 동작)', () => {
      service.castVote(roomId, userId, mockPlaceData.placeId)
      const result = service.castVote(roomId, userId, mockPlaceData.placeId) // 중복 호출

      // 중복 투표는 무시되어야 하므로 count는 변하지 않아야 함
      expect(result.count).toBe(1)
      expect(result.changed).toBe(false) // 중복 투표는 변경되지 않음
      const state = service.getVoteState(roomId, userId)
      expect(state.counts[mockPlaceData.placeId]).toBe(1)
      expect(state.myVotes).toContain(mockPlaceData.placeId) // myVotes에는 1개만
    })

    it('새로운 투표 시 changed 필드가 true여야 한다', () => {
      const result = service.castVote(roomId, userId, mockPlaceData.placeId)

      expect(result.changed).toBe(true)
      expect(result.candidateId).toBe(mockPlaceData.placeId)
      expect(result.userId).toBe(userId)
      expect(result.count).toBe(1)
    })

    it('중복 투표 시 changed 필드가 false여야 한다', () => {
      service.castVote(roomId, userId, mockPlaceData.placeId)
      const result = service.castVote(roomId, userId, mockPlaceData.placeId)

      expect(result.changed).toBe(false)
      expect(result.count).toBe(1)
    })

    it('투표 취소(revokeVote)가 동작해야 한다', () => {
      service.castVote(roomId, userId, mockPlaceData.placeId)
      const result = service.revokeVote(roomId, userId, mockPlaceData.placeId)

      expect(result.candidateId).toBe(mockPlaceData.placeId)
      expect(result.userId).toBe(userId)
      expect(result.count).toBe(0)
      expect(result.changed).toBe(true) // 투표 취소 성공 시 변경됨

      const state = service.getVoteState(roomId, userId)
      expect(state.counts[mockPlaceData.placeId]).toBe(0)
      expect(state.myVotes).not.toContain(mockPlaceData.placeId)
    })

    it('투표하지 않은 후보 취소 시도 시 changed 필드가 false여야 한다', () => {
      const result = service.revokeVote(roomId, userId, mockPlaceData.placeId)

      expect(result.changed).toBe(false)
      expect(result.candidateId).toBe(mockPlaceData.placeId)
      expect(result.userId).toBe(userId)
      expect(result.count).toBe(0)
    })

    it('투표 취소 성공 시 changed 필드가 true여야 한다', () => {
      service.castVote(roomId, userId, mockPlaceData.placeId)
      const result = service.revokeVote(roomId, userId, mockPlaceData.placeId)

      expect(result.changed).toBe(true)
      expect(result.count).toBe(0)
    })

    it('투표 변경(recastVote)이 동작해야 한다', () => {
      // 세션 초기화 (WAITING 상태로)
      service.deleteSession(roomId)
      service.getOrCreateSession(roomId, userId)
      service.addCandidatePlace(roomId, userId, mockPlaceData)

      const place2 = { ...mockPlaceData, placeId: 'place-456' }
      service.addCandidatePlace(roomId, userId, place2)

      service.startVote(roomId) // 투표 시작

      // 1. 초기 투표
      service.castVote(roomId, userId, mockPlaceData.placeId)

      // 2. 투표 변경 (place-123 -> place-456)
      const result = service.recastVote(roomId, userId, mockPlaceData.placeId, place2.placeId)

      // 검증
      expect(result.changed).toBe(true)

      // oldVoteResult 검증
      expect(result.oldVoteResult.candidateId).toBe(mockPlaceData.placeId)
      expect(result.oldVoteResult.count).toBe(0)

      // newVoteResult 검증
      expect(result.newVoteResult.candidateId).toBe(place2.placeId)
      expect(result.newVoteResult.count).toBe(1)

      // 상태 검증
      const state = service.getVoteState(roomId, userId)
      expect(state.counts[mockPlaceData.placeId]).toBe(0)
      expect(state.counts[place2.placeId]).toBe(1)
      expect(state.myVotes).not.toContain(mockPlaceData.placeId)
      expect(state.myVotes).toContain(place2.placeId)
    })

    it('투표하지 않은 후보를 변경하려고 하면 예외를 던지지 않고 새 투표만 적용된다', () => {
      // 세션 초기화 (WAITING 상태로)
      service.deleteSession(roomId)
      service.getOrCreateSession(roomId, userId)
      service.addCandidatePlace(roomId, userId, mockPlaceData)

      const place2 = { ...mockPlaceData, placeId: 'place-456' }
      service.addCandidatePlace(roomId, userId, place2)

      service.startVote(roomId) // 투표 시작

      const result = service.recastVote(roomId, userId, mockPlaceData.placeId, place2.placeId)

      expect(result.oldVoteResult.changed).toBe(false) // 취소 실패
      expect(result.newVoteResult.changed).toBe(true) // 투표 성공
      expect(result.changed).toBe(true)

      const state = service.getVoteState(roomId, userId)
      expect(state.myVotes).toContain(place2.placeId)
    })

    it('존재하지 않는 후보에 투표하면 예외를 던져야 한다', () => {
      expect(() => {
        service.castVote(roomId, userId, 'invalid-id')
      }).toThrow(CustomException)

      try {
        service.castVote(roomId, userId, 'invalid-id')
      } catch (e) {
        expect((e as CustomException).type).toBe(ErrorType.NotFound)
      }
    })

    it('WAITING 상태에서는 투표할 수 없다', () => {
      // 세션을 새로 생성하여 WAITING 상태로 만들기
      service.deleteSession(roomId)
      service.getOrCreateSession(roomId, userId)
      service.addCandidatePlace(roomId, userId, mockPlaceData)
      // startVote를 호출하지 않아서 WAITING 상태 유지

      expect(() => {
        service.castVote(roomId, userId, mockPlaceData.placeId)
      }).toThrow(CustomException)

      try {
        service.castVote(roomId, userId, mockPlaceData.placeId)
      } catch (e) {
        expect((e as CustomException).type).toBe(ErrorType.VoteNotInProgress)
      }
    })

    it('COMPLETED 상태에서는 투표할 수 없다', () => {
      service.endVote(roomId) // IN_PROGRESS -> COMPLETED

      expect(() => {
        service.castVote(roomId, userId, mockPlaceData.placeId)
      }).toThrow(CustomException)

      try {
        service.castVote(roomId, userId, mockPlaceData.placeId)
      } catch (e) {
        expect((e as CustomException).type).toBe(ErrorType.VoteNotInProgress)
      }
    })

    it('결선 투표(singleVote=true)에서는 1인 1표만 가능하다', () => {
      // 1. 세션 초기화 (WAITING 상태로)
      service.deleteSession(roomId)
      service.getOrCreateSession(roomId, userId)

      // 2. 후보 2명 등록 (WAITING 상태에서만 가능)
      service.addCandidatePlace(roomId, userId, mockPlaceData)
      const place2 = { ...mockPlaceData, placeId: 'place-456' }
      service.addCandidatePlace(roomId, userId, place2)

      // 3. 투표 시작
      service.startVote(roomId)

      // 4. 결선 투표 상황 강제 설정
      const session = service.getSessionOrThrow(roomId)
      session.singleVote = true

      // 첫 번째 투표 성공
      service.castVote(roomId, userId, mockPlaceData.placeId)

      // 두 번째 투표 시도 (다른 후보) -> 예외 발생
      expect(() => {
        service.castVote(roomId, userId, place2.placeId)
      }).toThrow(CustomException)

      try {
        service.castVote(roomId, userId, place2.placeId)
      } catch (e) {
        expect((e as CustomException).type).toBe(ErrorType.VoteSingleVoteLimit)
      }
    })
  })

  describe('Owner Actions & State Transitions', () => {
    beforeEach(() => {
      service.getOrCreateSession(roomId, userId)
      service.addCandidatePlace(roomId, userId, mockPlaceData)
    })

    it('투표 시작(startVote) 시 상태가 IN_PROGRESS로 변경되어야 한다', () => {
      const result = service.startVote(roomId)
      expect(result.status).toBe(VoteStatus.IN_PROGRESS)

      const session = service.getSessionOrThrow(roomId)
      expect(session.status).toBe(VoteStatus.IN_PROGRESS)
    })

    it('후보가 없으면 투표를 시작할 수 없다', () => {
      // 후보 삭제
      service.removeCandidatePlace(roomId, mockPlaceData.placeId)

      expect(() => {
        service.startVote(roomId)
      }).toThrow(CustomException)

      try {
        service.startVote(roomId)
      } catch (e) {
        expect((e as CustomException).type).toBe(ErrorType.NoCandidates)
      }
    })

    it('이미 시작된 투표를 다시 시작할 수 없다', () => {
      service.startVote(roomId)

      expect(() => {
        service.startVote(roomId)
      }).toThrow(CustomException)

      try {
        service.startVote(roomId)
      } catch (e) {
        expect((e as CustomException).type).toBe(ErrorType.BadRequest)
      }
    })

    it('투표 종료(endVote) 시 상태가 COMPLETED로 변경되어야 한다', () => {
      service.startVote(roomId)
      const result = service.endVote(roomId)

      expect(result.type).toBe('completed')
      expect(result.payload).toBeDefined()
      expect('candidates' in result.payload).toBe(true)
      const session = service.getSessionOrThrow(roomId)
      expect(session.status).toBe(VoteStatus.COMPLETED)
    })

    it('IN_PROGRESS 상태가 아니면 투표를 종료할 수 없다', () => {
      // WAITING 상태에서 종료 시도
      expect(() => {
        service.endVote(roomId)
      }).toThrow(CustomException)

      try {
        service.endVote(roomId)
      } catch (e) {
        expect((e as CustomException).type).toBe(ErrorType.BadRequest)
      }
    })

    it('동률 발생 시 결선 투표(runoff)로 전환되어야 한다', () => {
      const place2 = { ...mockPlaceData, placeId: 'place-456' }
      service.addCandidatePlace(roomId, userId, place2)
      service.startVote(roomId)

      // 동률 상황: place1(1표), place2(1표)
      service.castVote(roomId, userId, mockPlaceData.placeId)
      service.castVote(roomId, userId2, place2.placeId)

      const result = service.endVote(roomId)

      expect(result.type).toBe('runoff')
      const session = service.getSessionOrThrow(roomId)
      expect(session.status).toBe(VoteStatus.IN_PROGRESS) // 결선도 IN_PROGRESS
      expect(session.round).toBe(2)
      expect(session.singleVote).toBe(true)
      expect(session.candidates.size).toBe(2) // 동률 후보만 남음
      expect(session.userVotes.size).toBe(0) // 투표 초기화
    })

    it('결선 투표에서도 동률 발생 시 방장 선택(owner-pick)으로 전환되어야 한다', () => {
      const place2 = { ...mockPlaceData, placeId: 'place-456' }
      service.addCandidatePlace(roomId, userId, place2)
      service.startVote(roomId)

      // 1차 투표 동률 -> 결선 투표
      service.castVote(roomId, userId, mockPlaceData.placeId)
      service.castVote(roomId, userId2, place2.placeId)
      service.endVote(roomId)

      // 2차 투표(결선) 동률
      service.castVote(roomId, userId, mockPlaceData.placeId)
      service.castVote(roomId, userId2, place2.placeId)

      const result = service.endVote(roomId)

      expect(result.type).toBe('owner-pick')
      const session = service.getSessionOrThrow(roomId)
      expect(session.status).toBe(VoteStatus.OWNER_PICK)
    })
  })

  describe('Owner Select & Reset', () => {
    beforeEach(() => {
      service.getOrCreateSession(roomId, userId)
      service.addCandidatePlace(roomId, userId, mockPlaceData)
      const session = service.getSessionOrThrow(roomId)
      session.status = VoteStatus.OWNER_PICK // 강제 상태 설정
    })

    it('방장이 후보를 선택하면 투표가 종료되어야 한다', () => {
      const result = service.ownerSelect(roomId, mockPlaceData.placeId)

      expect(result.status).toBe('COMPLETED')
      expect(result.selectedCandidateId).toBe(mockPlaceData.placeId)

      const session = service.getSessionOrThrow(roomId)
      expect(session.status).toBe(VoteStatus.COMPLETED)
    })

    it('OWNER_PICK 상태가 아니면 방장 선택을 할 수 없다', () => {
      const session = service.getSessionOrThrow(roomId)
      session.status = VoteStatus.IN_PROGRESS

      expect(() => {
        service.ownerSelect(roomId, mockPlaceData.placeId)
      }).toThrow(CustomException)
    })

    it('완료된 투표를 리셋하면 WAITING 상태로 돌아가야 한다', () => {
      const session = service.getSessionOrThrow(roomId)
      session.status = VoteStatus.COMPLETED
      session.userVotes.set(userId, new Set([mockPlaceData.placeId]))
      session.totalCounts.set(mockPlaceData.placeId, 1)

      const result = service.resetVote(roomId)

      expect(result.status).toBe('WAITING')
      expect(session.status).toBe(VoteStatus.WAITING)
      expect(session.userVotes.size).toBe(0)
      expect(session.totalCounts.size).toBe(0)
      expect(session.candidates.size).toBe(1) // 후보는 유지
    })

    it('완료되지 않은 투표는 리셋할 수 없다', () => {
      const session = service.getSessionOrThrow(roomId)
      session.status = VoteStatus.IN_PROGRESS

      expect(() => {
        service.resetVote(roomId)
      }).toThrow(CustomException)
    })
  })

  describe('getVoteState', () => {
    it('현재 투표 현황을 올바르게 반환해야 한다', () => {
      service.getOrCreateSession(roomId, userId)
      const cand1 = service.addCandidatePlace(roomId, userId, mockPlaceData)
      const cand2 = service.addCandidatePlace(roomId, userId, { ...mockPlaceData, placeId: 'place-456' })

      service.startVote(roomId)

      // User1: cand1 투표
      service.castVote(roomId, userId, cand1.candidate.placeId)
      // User2: cand1, cand2 투표 (다중 투표)
      service.castVote(roomId, userId2, cand1.candidate.placeId)
      service.castVote(roomId, userId2, cand2.candidate.placeId)

      // User1 시점 조회
      const state = service.getVoteState(roomId, userId)

      expect(state.status).toBe(VoteStatus.IN_PROGRESS)
      expect(state.candidates.length).toBe(2)

      // 집계 확인 (totalCounts 기반 집계)
      expect(state.counts[cand1.candidate.placeId]).toBe(2) // User1 + User2
      expect(state.counts[cand2.candidate.placeId]).toBe(1) // User2

      // 내 투표 확인
      expect(state.myVotes).toContain(cand1.candidate.placeId)
      expect(state.myVotes).not.toContain(cand2.candidate.placeId)
    })

    it('투표하지 않은 사용자의 myVotes는 빈 배열이어야 한다', () => {
      service.getOrCreateSession(roomId, userId)
      service.addCandidatePlace(roomId, userId, mockPlaceData)
      service.startVote(roomId)

      const state = service.getVoteState(roomId, userId2)
      expect(state.myVotes).toEqual([])
    })

    it('존재하지 않는 세션에 대해 예외를 던져야 한다', () => {
      expect(() => {
        service.getVoteState('non-existent', userId)
      }).toThrow(CustomException)

      try {
        service.getVoteState('non-existent', userId)
      } catch (e) {
        expect((e as CustomException).type).toBe(ErrorType.NotFound)
      }
    })
  })

  describe('getMyVotes', () => {
    beforeEach(() => {
      service.getOrCreateSession(roomId, userId)
      service.addCandidatePlace(roomId, userId, mockPlaceData)
      service.startVote(roomId)
    })

    it('투표하지 않은 사용자의 myVotes는 빈 배열이어야 한다', () => {
      const result = service.getMyVotes(roomId, userId)

      expect(result.myVotes).toEqual([])
    })

    it('투표한 후보가 myVotes에 포함되어야 한다', () => {
      service.castVote(roomId, userId, mockPlaceData.placeId)
      const result = service.getMyVotes(roomId, userId)

      expect(result.myVotes).toHaveLength(1)
      expect(result.myVotes).toContain(mockPlaceData.placeId)
    })

    it('여러 후보에 투표한 경우 모든 후보가 myVotes에 포함되어야 한다', () => {
      // beforeEach에서 이미 startVote를 호출했으므로, 세션을 새로 생성해야 함
      service.deleteSession(roomId)
      service.getOrCreateSession(roomId, userId)
      service.addCandidatePlace(roomId, userId, mockPlaceData)
      const place2 = { ...mockPlaceData, placeId: 'place-456' }
      service.addCandidatePlace(roomId, userId, place2)
      service.startVote(roomId)

      service.castVote(roomId, userId, mockPlaceData.placeId)
      service.castVote(roomId, userId, place2.placeId)

      const result = service.getMyVotes(roomId, userId)

      expect(result.myVotes).toHaveLength(2)
      expect(result.myVotes).toContain(mockPlaceData.placeId)
      expect(result.myVotes).toContain(place2.placeId)
    })

    it('투표 취소 후 myVotes에서 제거되어야 한다', () => {
      service.castVote(roomId, userId, mockPlaceData.placeId)
      service.revokeVote(roomId, userId, mockPlaceData.placeId)

      const result = service.getMyVotes(roomId, userId)

      expect(result.myVotes).toEqual([])
    })

    it('존재하지 않는 세션에 대해 예외를 던져야 한다', () => {
      expect(() => {
        service.getMyVotes('non-existent', userId)
      }).toThrow(CustomException)

      try {
        service.getMyVotes('non-existent', userId)
      } catch (e) {
        expect((e as CustomException).type).toBe(ErrorType.NotFound)
      }
    })
  })

  describe('getSessionOrThrow', () => {
    it('존재하는 세션을 반환해야 한다', () => {
      service.getOrCreateSession(roomId, userId)
      const session = service.getSessionOrThrow(roomId)

      expect(session).toBeDefined()
      expect(session.status).toBe(VoteStatus.WAITING)
    })

    it('존재하지 않는 세션에 대해 예외를 던져야 한다', () => {
      expect(() => {
        service.getSessionOrThrow('non-existent')
      }).toThrow(CustomException)

      try {
        service.getSessionOrThrow('non-existent')
      } catch (e) {
        expect((e as CustomException).type).toBe(ErrorType.NotFound)
      }
    })
  })

  describe('revokeAllVotesForUser', () => {
    const baseRoomId = 'room-123'
    const categoryId1 = 'category-1'
    const categoryId2 = 'category-2'
    const voteRoomId1 = `${baseRoomId}:${categoryId1}`
    const voteRoomId2 = `${baseRoomId}:${categoryId2}`
    const otherRoomId = 'other-room'
    const otherVoteRoomId = `${otherRoomId}:${categoryId1}`

    const place1: PlaceData = { ...mockPlaceData, placeId: 'place-1' }
    const place2: PlaceData = { ...mockPlaceData, placeId: 'place-2' }

    it('투표가 없는 경우 빈 배열을 반환해야 한다', () => {
      service.getOrCreateSession(voteRoomId1, userId)

      const result = service.revokeAllVotesForUser(baseRoomId, userId)

      expect(result).toEqual([])
    })

    it('WAITING 상태의 세션은 무시해야 한다', () => {
      service.getOrCreateSession(voteRoomId1, userId)
      service.addCandidatePlace(voteRoomId1, userId, place1)
      // startVote를 호출하지 않아 WAITING 상태 유지

      const result = service.revokeAllVotesForUser(baseRoomId, userId)

      expect(result).toEqual([])
    })

    it('COMPLETED 상태의 세션은 무시해야 한다', () => {
      service.getOrCreateSession(voteRoomId1, userId)
      service.addCandidatePlace(voteRoomId1, userId, place1)
      service.startVote(voteRoomId1)
      service.castVote(voteRoomId1, userId, place1.placeId)
      service.endVote(voteRoomId1) // COMPLETED 상태로 변경

      const result = service.revokeAllVotesForUser(baseRoomId, userId)

      expect(result).toEqual([])
    })

    it('IN_PROGRESS 상태에서 사용자의 투표가 모두 취소되어야 한다', () => {
      service.getOrCreateSession(voteRoomId1, userId)
      service.addCandidatePlace(voteRoomId1, userId, place1)
      service.addCandidatePlace(voteRoomId1, userId, place2)
      service.startVote(voteRoomId1)
      service.castVote(voteRoomId1, userId, place1.placeId)
      service.castVote(voteRoomId1, userId, place2.placeId)

      const result = service.revokeAllVotesForUser(baseRoomId, userId)

      expect(result).toHaveLength(1)
      expect(result[0].voteRoomId).toBe(voteRoomId1)
      expect(result[0].payload.userId).toBe(userId)
      expect(result[0].payload.counts[place1.placeId]).toBe(0)
      expect(result[0].payload.counts[place2.placeId]).toBe(0)
      expect(result[0].payload.voters[place1.placeId]).toEqual([])
      expect(result[0].payload.voters[place2.placeId]).toEqual([])

      // 세션에서도 투표가 삭제되었는지 확인
      const state = service.getVoteState(voteRoomId1, userId)
      expect(state.myVotes).toEqual([])
      expect(state.counts[place1.placeId]).toBe(0)
      expect(state.counts[place2.placeId]).toBe(0)
    })

    it('여러 카테고리에 투표한 경우 모두 취소되어야 한다', () => {
      // 카테고리 1 설정
      service.getOrCreateSession(voteRoomId1, userId)
      service.addCandidatePlace(voteRoomId1, userId, place1)
      service.startVote(voteRoomId1)
      service.castVote(voteRoomId1, userId, place1.placeId)

      // 카테고리 2 설정
      service.getOrCreateSession(voteRoomId2, userId)
      service.addCandidatePlace(voteRoomId2, userId, place2)
      service.startVote(voteRoomId2)
      service.castVote(voteRoomId2, userId, place2.placeId)

      const result = service.revokeAllVotesForUser(baseRoomId, userId)

      expect(result).toHaveLength(2)

      const room1Result = result.find(r => r.voteRoomId === voteRoomId1)
      const room2Result = result.find(r => r.voteRoomId === voteRoomId2)

      expect(room1Result).toBeDefined()
      expect(room1Result!.payload.counts[place1.placeId]).toBe(0)

      expect(room2Result).toBeDefined()
      expect(room2Result!.payload.counts[place2.placeId]).toBe(0)
    })

    it('다른 방의 세션은 영향받지 않아야 한다', () => {
      // baseRoomId의 카테고리
      service.getOrCreateSession(voteRoomId1, userId)
      service.addCandidatePlace(voteRoomId1, userId, place1)
      service.startVote(voteRoomId1)
      service.castVote(voteRoomId1, userId, place1.placeId)

      // 다른 방의 카테고리
      service.getOrCreateSession(otherVoteRoomId, userId)
      service.addCandidatePlace(otherVoteRoomId, userId, place2)
      service.startVote(otherVoteRoomId)
      service.castVote(otherVoteRoomId, userId, place2.placeId)

      const result = service.revokeAllVotesForUser(baseRoomId, userId)

      // baseRoomId의 투표만 취소
      expect(result).toHaveLength(1)
      expect(result[0].voteRoomId).toBe(voteRoomId1)

      // 다른 방의 투표는 유지
      const otherState = service.getVoteState(otherVoteRoomId, userId)
      expect(otherState.myVotes).toContain(place2.placeId)
      expect(otherState.counts[place2.placeId]).toBe(1)
    })

    it('다른 사용자의 투표는 영향받지 않아야 한다', () => {
      service.getOrCreateSession(voteRoomId1, userId)
      service.addCandidatePlace(voteRoomId1, userId, place1)
      service.startVote(voteRoomId1)

      // user1과 user2 모두 투표
      service.castVote(voteRoomId1, userId, place1.placeId)
      service.castVote(voteRoomId1, userId2, place1.placeId)

      const result = service.revokeAllVotesForUser(baseRoomId, userId)

      expect(result).toHaveLength(1)
      expect(result[0].payload.counts[place1.placeId]).toBe(1) // user2의 투표만 남음
      expect(result[0].payload.voters[place1.placeId]).toEqual([userId2])

      // user2의 투표는 유지
      const state = service.getVoteState(voteRoomId1, userId2)
      expect(state.myVotes).toContain(place1.placeId)
    })

    it('투표하지 않은 사용자에 대해 빈 배열을 반환해야 한다', () => {
      service.getOrCreateSession(voteRoomId1, userId)
      service.addCandidatePlace(voteRoomId1, userId, place1)
      service.startVote(voteRoomId1)
      service.castVote(voteRoomId1, userId, place1.placeId)

      // userId2는 투표하지 않음
      const result = service.revokeAllVotesForUser(baseRoomId, userId2)

      expect(result).toEqual([])

      // userId의 투표는 유지
      const state = service.getVoteState(voteRoomId1, userId)
      expect(state.counts[place1.placeId]).toBe(1)
    })

    it('반환값의 voters에서 해당 사용자가 제거되어야 한다', () => {
      service.getOrCreateSession(voteRoomId1, userId)
      service.addCandidatePlace(voteRoomId1, userId, place1)
      service.startVote(voteRoomId1)

      // 여러 사용자가 투표
      service.castVote(voteRoomId1, userId, place1.placeId)
      service.castVote(voteRoomId1, userId2, place1.placeId)

      const result = service.revokeAllVotesForUser(baseRoomId, userId)

      expect(result[0].payload.voters[place1.placeId]).not.toContain(userId)
      expect(result[0].payload.voters[place1.placeId]).toContain(userId2)
    })
  })
})
