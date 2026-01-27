import { VoteSessionStore } from './vote-session.store'
import { VoteStatus, VoteSession, Candidate } from './vote.types'

describe('VoteSessionStore', () => {
  let store: VoteSessionStore

  const createCandidate = (placeId: string, name: string, createdBy: string): Candidate => ({
    placeId,
    name,
    address: '서울시 강남구',
    createdBy,
    createdAt: new Date(),
  })

  const createSession = (status: VoteStatus = VoteStatus.WAITING): VoteSession => ({
    status,
    candidates: new Map(),
    userVotes: new Map(),
    totalCounts: new Map(),
  })

  beforeEach(() => {
    store = new VoteSessionStore()
  })

  describe('get', () => {
    it('canvasId로 세션을 조회한다', () => {
      const canvasId = 'canvas-1'
      const session = createSession()
      store.set(canvasId, session)

      const result = store.get(canvasId)

      expect(result).toEqual(session)
    })

    it('존재하지 않는 canvasId로 조회하면 undefined를 반환한다', () => {
      const result = store.get('non-existent')

      expect(result).toBeUndefined()
    })
  })

  describe('set', () => {
    it('세션을 저장한다', () => {
      const canvasId = 'canvas-1'
      const session = createSession()

      store.set(canvasId, session)

      expect(store.get(canvasId)).toEqual(session)
    })

    it('동일한 canvasId로 저장하면 세션이 덮어씌워진다', () => {
      const canvasId = 'canvas-1'
      const initialSession = createSession(VoteStatus.WAITING)
      store.set(canvasId, initialSession)

      const updatedSession: VoteSession = {
        ...createSession(VoteStatus.IN_PROGRESS),
        candidates: new Map([['place-1', createCandidate('place-1', '카페 A', 'user-1')]]),
      }
      store.set(canvasId, updatedSession)

      const result = store.get(canvasId)
      expect(result).toEqual(updatedSession)
      expect(result?.status).toBe(VoteStatus.IN_PROGRESS)
      expect(result?.candidates.size).toBe(1)
    })

    it('후보와 투표 데이터가 포함된 세션을 저장한다', () => {
      const canvasId = 'canvas-1'
      const candidate1 = createCandidate('place-1', '카페 A', 'user-1')
      const candidate2 = createCandidate('place-2', '식당 B', 'user-2')

      const session: VoteSession = {
        status: VoteStatus.IN_PROGRESS,
        candidates: new Map([
          ['place-1', candidate1],
          ['place-2', candidate2],
        ]),
        userVotes: new Map([
          ['user-1', new Set(['place-1'])],
          ['user-2', new Set(['place-2'])],
        ]),
        totalCounts: new Map([
          ['place-1', 1],
          ['place-2', 1],
        ]),
      }

      store.set(canvasId, session)

      const result = store.get(canvasId)
      expect(result).toEqual(session)
      expect(result?.candidates.size).toBe(2)
      expect(result?.userVotes.size).toBe(2)
      expect(result?.totalCounts.size).toBe(2)
    })
  })

  describe('delete', () => {
    it('세션을 삭제한다', () => {
      const canvasId = 'canvas-1'
      const session = createSession()
      store.set(canvasId, session)

      store.delete(canvasId)

      expect(store.get(canvasId)).toBeUndefined()
    })
  })

  describe('has', () => {
    it('존재하는 canvasId에 대해 true를 반환한다', () => {
      const canvasId = 'canvas-1'
      const session = createSession()
      store.set(canvasId, session)

      expect(store.has(canvasId)).toBe(true)
    })

    it('존재하지 않는 canvasId에 대해 false를 반환한다', () => {
      expect(store.has('non-existent')).toBe(false)
    })

    it('삭제된 canvasId에 대해 false를 반환한다', () => {
      const canvasId = 'canvas-1'
      const session = createSession()
      store.set(canvasId, session)
      store.delete(canvasId)

      expect(store.has(canvasId)).toBe(false)
    })
  })

  describe('여러 세션 관리', () => {
    it('여러 canvasId에 대해 독립적으로 세션을 관리한다', () => {
      const canvasId1 = 'canvas-1'
      const canvasId2 = 'canvas-2'
      const session1 = createSession(VoteStatus.WAITING)
      const session2 = createSession(VoteStatus.IN_PROGRESS)

      store.set(canvasId1, session1)
      store.set(canvasId2, session2)

      expect(store.get(canvasId1)).toEqual(session1)
      expect(store.get(canvasId2)).toEqual(session2)
      expect(store.has(canvasId1)).toBe(true)
      expect(store.has(canvasId2)).toBe(true)
    })

    it('한 세션을 삭제해도 다른 세션은 유지된다', () => {
      const canvasId1 = 'canvas-1'
      const canvasId2 = 'canvas-2'
      const session1 = createSession()
      const session2 = createSession()

      store.set(canvasId1, session1)
      store.set(canvasId2, session2)
      store.delete(canvasId1)

      expect(store.get(canvasId1)).toBeUndefined()
      expect(store.get(canvasId2)).toEqual(session2)
    })
  })
})
