import { Test, TestingModule } from '@nestjs/testing'
import { VoteService } from './vote.service'
import { VoteStatus, PlaceData } from './vote.types'
import { CustomException } from '@/lib/exceptions/custom.exception'
import { ErrorType } from '@/lib/types/response.type'

// 테스트용 더미 데이터
const mockPlaceData: PlaceData = {
  id: 'place-123',
  place_name: 'Test Place',
  address_name: 'Test Address',
  road_address_name: 'Test Road Address',
  category_group_name: 'Food',
  phone: '010-1234-5678',
  place_url: 'http://test.com',
  distance: '100',
  x: '100',
  y: '200',
}

describe('VoteService', () => {
  let service: VoteService
  const roomId = 'room-abc'
  const userId = 'user-1'
  const userId2 = 'user-2'

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VoteService],
    }).compile()

    service = module.get<VoteService>(VoteService)
  })

  describe('Session Management', () => {
    it('세션이 없으면 새로 생성해야 한다', () => {
      const session = service.getOrCreateSession(roomId)
      expect(session).toBeDefined()
      expect(session.status).toBe(VoteStatus.WAITING)
      expect(session.candidates.size).toBe(0)
    })

    it('이미 세션이 있으면 기존 세션을 반환해야 한다', () => {
      const session1 = service.getOrCreateSession(roomId)
      session1.status = VoteStatus.IN_PROGRESS // 상태 변경

      const session2 = service.getOrCreateSession(roomId)
      expect(session2.status).toBe(VoteStatus.IN_PROGRESS) // 변경된 상태 유지 확인
      expect(session1).toBe(session2) // 같은 객체 참조 확인
    })

    it('세션을 삭제할 수 있어야 한다', () => {
      service.getOrCreateSession(roomId)
      service.deleteSession(roomId)

      // getSessionOrThrow 호출 시 예외 발생해야 함
      expect(() => service.getSessionOrThrow(roomId)).toThrow(CustomException)
    })
  })

  describe('Candidate Management', () => {
    beforeEach(() => {
      service.getOrCreateSession(roomId)
    })

    it('WAITING 상태에서 후보를 등록할 수 있어야 한다', () => {
      const candidate = service.addCandidatePlace(roomId, userId, mockPlaceData)

      expect(candidate).toBeDefined()
      expect(candidate.id).toBe(mockPlaceData.id)
      expect(candidate.createdBy).toBe(userId)

      const session = service.getSessionOrThrow(roomId)
      expect(session.candidates.has(mockPlaceData.id)).toBe(true)
    })

    it('중복된 후보(같은 ID) 등록 시 예외를 던져야 한다', () => {
      service.addCandidatePlace(roomId, userId, mockPlaceData)

      expect(() => {
        service.addCandidatePlace(roomId, userId, mockPlaceData)
      }).toThrow(CustomException)

      try {
        service.addCandidatePlace(roomId, userId, mockPlaceData)
      } catch (e) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(e.type).toBe(ErrorType.DuplicatedCandidate)
      }
    })

    it('투표가 시작된 후(IN_PROGRESS)에는 후보를 등록할 수 없다', () => {
      service.addCandidatePlace(roomId, userId, mockPlaceData)
      service.startVote(roomId) // WAITING -> IN_PROGRESS

      expect(() => {
        service.addCandidatePlace(roomId, userId, { ...mockPlaceData, id: 'place-456' })
      }).toThrow(CustomException)
    })

    it('후보를 삭제할 수 있어야 한다', () => {
      service.addCandidatePlace(roomId, userId, mockPlaceData)
      const deletedId = service.removeCandidatePlace(roomId, mockPlaceData.id)

      expect(deletedId).toBe(mockPlaceData.id)
      const session = service.getSessionOrThrow(roomId)
      expect(session.candidates.has(mockPlaceData.id)).toBe(false)
    })
  })

  describe('Voting Process', () => {
    beforeEach(() => {
      service.getOrCreateSession(roomId)
      service.addCandidatePlace(roomId, userId, mockPlaceData)
      service.startVote(roomId) // 상태: IN_PROGRESS
    })

    it('IN_PROGRESS 상태에서 투표(castVote)가 가능해야 한다', () => {
      service.castVote(roomId, userId, mockPlaceData.id)

      const state = service.getVoteState(roomId, userId)
      expect(state.counts[mockPlaceData.id]).toBe(1)
      expect(state.myVotes).toContain(mockPlaceData.id)
    })

    it('여러 유저가 투표하면 집계가 정확해야 한다', () => {
      service.castVote(roomId, userId, mockPlaceData.id)
      service.castVote(roomId, userId2, mockPlaceData.id)

      const state = service.getVoteState(roomId, userId)
      expect(state.counts[mockPlaceData.id]).toBe(2)
    })

    it('한 유저가 같은 후보에 여러 번 투표해도 1표만 인정되어야 한다 (Set 동작)', () => {
      service.castVote(roomId, userId, mockPlaceData.id)
      service.castVote(roomId, userId, mockPlaceData.id) // 중복 호출

      const state = service.getVoteState(roomId, userId)
      expect(state.counts[mockPlaceData.id]).toBe(1)
    })

    it('투표 취소(revokeVote)가 동작해야 한다', () => {
      service.castVote(roomId, userId, mockPlaceData.id)
      service.revokeVote(roomId, userId, mockPlaceData.id)

      const state = service.getVoteState(roomId, userId)
      expect(state.counts[mockPlaceData.id]).toBe(0)
      expect(state.myVotes).not.toContain(mockPlaceData.id)
    })

    it('존재하지 않는 후보에 투표하면 예외를 던져야 한다', () => {
      expect(() => {
        service.castVote(roomId, userId, 'invalid-id')
      }).toThrow(CustomException)
    })

    it('WAITING 상태에서는 투표할 수 없다', () => {
      service.resetVote(roomId) // 다시 WAITING으로
      expect(() => {
        service.castVote(roomId, userId, mockPlaceData.id)
      }).toThrow(CustomException)
    })
  })

  describe('Owner Actions & State Transitions', () => {
    beforeEach(() => {
      service.getOrCreateSession(roomId)
      service.addCandidatePlace(roomId, userId, mockPlaceData)
    })

    it('투표 시작(startVote) 시 상태가 IN_PROGRESS로 변경되어야 한다', () => {
      service.startVote(roomId)
      const session = service.getSessionOrThrow(roomId)
      expect(session.status).toBe(VoteStatus.IN_PROGRESS)
    })

    it('후보가 없으면 투표를 시작할 수 없다', () => {
      // 후보 삭제
      service.removeCandidatePlace(roomId, mockPlaceData.id)

      expect(() => {
        service.startVote(roomId)
      }).toThrow(CustomException)
    })

    it('투표 종료(endVote) 시 상태가 COMPLETED로 변경되어야 한다', () => {
      service.startVote(roomId)
      service.endVote(roomId)

      const session = service.getSessionOrThrow(roomId)
      expect(session.status).toBe(VoteStatus.COMPLETED)
    })

    it('투표 리셋(resetVote) 시 WAITING 상태가 되고 투표 기록이 초기화되어야 한다', () => {
      // 1. 투표 진행 및 투표
      service.startVote(roomId)
      service.castVote(roomId, userId, mockPlaceData.id)

      // 2. 투표 종료
      service.endVote(roomId)

      // 3. 리셋 수행
      service.resetVote(roomId)

      const session = service.getSessionOrThrow(roomId)
      expect(session.status).toBe(VoteStatus.WAITING)

      // 후보는 유지되어야 함
      expect(session.candidates.size).toBe(1)

      // 투표 기록은 삭제되어야 함
      expect(session.userVotes.size).toBe(0)
    })
  })

  describe('getVoteState', () => {
    it('현재 투표 현황을 올바르게 반환해야 한다', () => {
      service.getOrCreateSession(roomId)
      const cand1 = service.addCandidatePlace(roomId, userId, mockPlaceData)
      const cand2 = service.addCandidatePlace(roomId, userId, { ...mockPlaceData, id: 'place-456' })

      service.startVote(roomId)

      // User1: cand1 투표
      service.castVote(roomId, userId, cand1.id)
      // User2: cand1, cand2 투표 (다중 투표)
      service.castVote(roomId, userId2, cand1.id)
      service.castVote(roomId, userId2, cand2.id)

      // User1 시점 조회
      const state = service.getVoteState(roomId, userId)

      expect(state.status).toBe(VoteStatus.IN_PROGRESS)
      expect(state.candidates.length).toBe(2)

      // 집계 확인
      expect(state.counts[cand1.id]).toBe(2) // User1 + User2
      expect(state.counts[cand2.id]).toBe(1) // User2

      // 내 투표 확인
      expect(state.myVotes).toContain(cand1.id)
      expect(state.myVotes).not.toContain(cand2.id)
    })
  })
})
