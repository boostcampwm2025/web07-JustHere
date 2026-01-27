import { VoteSessionStore } from './vote-session.store'
import { VoteStatus, VoteSession } from './vote.type'

describe('VoteSessionStore', () => {
  let store: VoteSessionStore
  const now = new Date()

  const sessionA: VoteSession = {
    canvasId: 'canvas-1',
    meta: {
      status: VoteStatus.WAITING,
      ownerId: 'user-1',
      createdAt: now,
    },
    data: {
      candidates: new Map(),
    },
    aggs: {
      totalCounts: new Map(),
      userVotes: new Map(),
    },
  }

  beforeEach(() => {
    store = new VoteSessionStore()
  })

  describe('get', () => {
    it('canvasId로 세션을 조회한다', () => {
      store.set(sessionA.canvasId, sessionA)

      const result = store.get(sessionA.canvasId)

      expect(result).toEqual(sessionA)
    })

    it('존재하지 않는 canvasId로 조회하면 undefined를 반환한다', () => {
      const result = store.get('non-existent')

      expect(result).toBeUndefined()
    })
  })

  describe('set', () => {
    it('세션을 저장한다', () => {
      store.set(sessionA.canvasId, sessionA)

      expect(store.get(sessionA.canvasId)).toEqual(sessionA)
    })

    it('동일한 canvasId로 저장하면 세션이 덮어씌워진다', () => {
      store.set(sessionA.canvasId, sessionA)

      const updatedSession: VoteSession = {
        ...sessionA,
        meta: {
          ...sessionA.meta,
          status: VoteStatus.IN_PROGRESS,
        },
      }
      store.set(sessionA.canvasId, updatedSession)

      expect(store.get(sessionA.canvasId)).toEqual(updatedSession)
    })
  })

  describe('delete', () => {
    it('세션을 삭제한다', () => {
      store.set(sessionA.canvasId, sessionA)

      store.delete(sessionA.canvasId)

      expect(store.get(sessionA.canvasId)).toBeUndefined()
    })

    it('존재하지 않는 canvasId를 삭제해도 에러가 발생하지 않는다', () => {
      expect(() => store.delete('non-existent')).not.toThrow()
    })
  })
})
