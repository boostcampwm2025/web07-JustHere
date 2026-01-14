import { UserSessionStore } from './user-session.store'
import type { UserSession } from './user.type'

describe('UserSessionStore', () => {
  let store: UserSessionStore
  const now = new Date()

  const sessionA: UserSession = {
    socketId: 'socket-1',
    userId: 'user-1',
    nickname: 'ajin',
    roomId: 'room-1',
    color: 'hsl(0, 70%, 50%)',
    categoryId: null,
    joinedAt: now,
  }

  const sessionB: UserSession = {
    socketId: 'socket-2',
    userId: 'user-2',
    nickname: 'kim',
    roomId: 'room-1',
    color: 'hsl(120, 70%, 50%)',
    categoryId: 'cat-1',
    joinedAt: now,
  }

  const sessionC: UserSession = {
    socketId: 'socket-3',
    userId: 'user-3',
    nickname: 'lee',
    roomId: 'room-2',
    color: 'hsl(240, 70%, 50%)',
    categoryId: null,
    joinedAt: now,
  }

  beforeEach(() => {
    store = new UserSessionStore()
  })

  describe('get', () => {
    it('socketId로 세션을 조회한다', () => {
      store.set(sessionA.socketId, sessionA)

      const result = store.get(sessionA.socketId)

      expect(result).toEqual(sessionA)
    })

    it('존재하지 않는 socketId로 조회하면 undefined를 반환한다', () => {
      const result = store.get('non-existent')

      expect(result).toBeUndefined()
    })
  })

  describe('set', () => {
    it('세션을 저장한다', () => {
      store.set(sessionA.socketId, sessionA)

      expect(store.get(sessionA.socketId)).toEqual(sessionA)
    })

    it('동일한 socketId로 저장하면 세션이 덮어씌워진다', () => {
      store.set(sessionA.socketId, sessionA)

      const updatedSession = { ...sessionA, nickname: 'updated' }
      store.set(sessionA.socketId, updatedSession)

      expect(store.get(sessionA.socketId)).toEqual(updatedSession)
    })
  })

  describe('delete', () => {
    it('세션을 삭제한다', () => {
      store.set(sessionA.socketId, sessionA)

      store.delete(sessionA.socketId)

      expect(store.get(sessionA.socketId)).toBeUndefined()
    })

    it('존재하지 않는 socketId를 삭제해도 에러가 발생하지 않는다', () => {
      expect(() => store.delete('non-existent')).not.toThrow()
    })
  })

  describe('list', () => {
    it('모든 세션 목록을 반환한다', () => {
      store.set(sessionA.socketId, sessionA)
      store.set(sessionB.socketId, sessionB)
      store.set(sessionC.socketId, sessionC)

      const result = store.list()

      expect(result).toHaveLength(3)
      expect(result).toContainEqual(sessionA)
      expect(result).toContainEqual(sessionB)
      expect(result).toContainEqual(sessionC)
    })

    it('세션이 없으면 빈 배열을 반환한다', () => {
      const result = store.list()

      expect(result).toEqual([])
    })
  })

  describe('listByRoom', () => {
    it('특정 roomId의 세션 목록만 반환한다', () => {
      store.set(sessionA.socketId, sessionA)
      store.set(sessionB.socketId, sessionB)
      store.set(sessionC.socketId, sessionC)

      const result = store.listByRoom('room-1')

      expect(result).toHaveLength(2)
      expect(result).toContainEqual(sessionA)
      expect(result).toContainEqual(sessionB)
    })

    it('해당 roomId에 세션이 없으면 빈 배열을 반환한다', () => {
      store.set(sessionA.socketId, sessionA)

      const result = store.listByRoom('non-existent-room')

      expect(result).toEqual([])
    })
  })
})
