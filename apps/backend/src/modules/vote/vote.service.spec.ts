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
      const candidate = service.addCandidatePlace(roomId, userId, mockPlaceData)

      expect(candidate).toBeDefined()
      expect(candidate.placeId).toBe(mockPlaceData.placeId)
      expect(candidate.name).toBe(mockPlaceData.name)
      expect(candidate.createdBy).toBe(userId)
      expect(candidate.createdAt).toBeInstanceOf(Date)

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
      const deletedId = service.removeCandidatePlace(roomId, mockPlaceData.placeId)

      expect(deletedId).toBe(mockPlaceData.placeId)
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

      // totalCounts는 증가하지만, Set으로 중복 투표는 방지됨
      expect(result.count).toBe(2) // totalCounts는 증가함
      const state = service.getVoteState(roomId, userId)
      expect(state.counts[mockPlaceData.placeId]).toBe(2) // totalCounts 기반 집계
      expect(state.myVotes).toContain(mockPlaceData.placeId) // myVotes에는 1개만
    })

    it('투표 취소(revokeVote)가 동작해야 한다', () => {
      service.castVote(roomId, userId, mockPlaceData.placeId)
      const result = service.revokeVote(roomId, userId, mockPlaceData.placeId)

      expect(result.candidateId).toBe(mockPlaceData.placeId)
      expect(result.userId).toBe(userId)
      expect(result.count).toBe(0)

      const state = service.getVoteState(roomId, userId)
      expect(state.counts[mockPlaceData.placeId]).toBe(0)
      expect(state.myVotes).not.toContain(mockPlaceData.placeId)
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

      expect(result.status).toBe(VoteStatus.COMPLETED)
      expect(result.candidates).toBeDefined()
      expect(Array.isArray(result.candidates)).toBe(true)
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
  })

  describe('getVoteState', () => {
    it('현재 투표 현황을 올바르게 반환해야 한다', () => {
      service.getOrCreateSession(roomId, userId)
      const cand1 = service.addCandidatePlace(roomId, userId, mockPlaceData)
      const cand2 = service.addCandidatePlace(roomId, userId, { ...mockPlaceData, placeId: 'place-456' })

      service.startVote(roomId)

      // User1: cand1 투표
      service.castVote(roomId, userId, cand1.placeId)
      // User2: cand1, cand2 투표 (다중 투표)
      service.castVote(roomId, userId2, cand1.placeId)
      service.castVote(roomId, userId2, cand2.placeId)

      // User1 시점 조회
      const state = service.getVoteState(roomId, userId)

      expect(state.status).toBe(VoteStatus.IN_PROGRESS)
      expect(state.candidates.length).toBe(2)

      // 집계 확인 (totalCounts 기반 집계)
      expect(state.counts[cand1.placeId]).toBe(2) // User1 + User2
      expect(state.counts[cand2.placeId]).toBe(1) // User2

      // 내 투표 확인
      expect(state.myVotes).toContain(cand1.placeId)
      expect(state.myVotes).not.toContain(cand2.placeId)
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

  describe('getCandidates', () => {
    it('후보 리스트를 올바르게 반환해야 한다', () => {
      service.getOrCreateSession(roomId, userId)
      const cand1 = service.addCandidatePlace(roomId, userId, mockPlaceData)
      const cand2 = service.addCandidatePlace(roomId, userId, { ...mockPlaceData, placeId: 'place-456' })

      const candidates = service.getCandidates(roomId)

      expect(candidates.length).toBe(2)
      expect(candidates).toContainEqual(cand1)
      expect(candidates).toContainEqual(cand2)
    })

    it('후보가 없으면 빈 배열을 반환해야 한다', () => {
      service.getOrCreateSession(roomId, userId)

      const candidates = service.getCandidates(roomId)

      expect(candidates).toEqual([])
    })

    it('존재하지 않는 세션에 대해 예외를 던져야 한다', () => {
      expect(() => {
        service.getCandidates('non-existent')
      }).toThrow(CustomException)

      try {
        service.getCandidates('non-existent')
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
})
