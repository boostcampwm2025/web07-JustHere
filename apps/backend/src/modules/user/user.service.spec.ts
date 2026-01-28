import { UserService } from './user.service'
import { UserSessionStore } from './user-session.store'
import type { CreateSessionParams, UserSession } from './user.type'

describe('UserService', () => {
  let service: UserService
  let store: UserSessionStore
  const now = new Date()

  const createParams: CreateSessionParams = {
    socketId: 'socket-1',
    userId: 'user-1',
    name: 'user1',
    roomId: 'room-1',
  }

  const existingSession: UserSession = {
    socketId: 'socket-1',
    userId: 'user-1',
    name: 'user1',
    roomId: 'room-1',
    color: 'hsl(100, 70%, 50%)',
    joinedAt: now,
    isOwner: true,
  }

  beforeEach(() => {
    store = new UserSessionStore()
    service = new UserService(store)
  })

  describe('createSession', () => {
    it('새 세션을 생성하고 저장한다', () => {
      const result = service.createSession(createParams)

      expect(result.socketId).toBe(createParams.socketId)
      expect(result.userId).toBe(createParams.userId)
      expect(result.name).toBe(createParams.name)
      expect(result.roomId).toBe(createParams.roomId)
      expect(result.joinedAt).toBeInstanceOf(Date)
    })

    it('userId 기반으로 일관된 color를 생성한다', () => {
      const result1 = service.createSession(createParams)
      store.delete(createParams.socketId)

      const result2 = service.createSession(createParams)

      expect(result1.color).toBe(result2.color)
    })

    it('color는 hsl 형식이다', () => {
      const result = service.createSession(createParams)

      expect(result.color).toMatch(/^hsl\(\d+, 70%, 50%\)$/)
    })

    it('생성된 세션이 store에 저장된다', () => {
      const result = service.createSession(createParams)

      expect(store.get(createParams.socketId)).toEqual(result)
    })

    it('방에 첫 번째로 입장하면 isOwner가 true이다', () => {
      const result = service.createSession(createParams)

      expect(result.isOwner).toBe(true)
    })

    it('방에 두 번째로 입장하면 isOwner가 false이다', () => {
      // 첫 번째 유저 입장
      service.createSession(createParams)

      // 두 번째 유저 입장
      const secondParams: CreateSessionParams = {
        socketId: 'socket-2',
        userId: 'user-2',
        name: 'user2',
        roomId: 'room-1',
      }
      const result = service.createSession(secondParams)

      expect(result.isOwner).toBe(false)
    })
  })

  describe('getSession', () => {
    it('socketId로 세션을 조회한다', () => {
      store.set(existingSession.socketId, existingSession)

      const result = service.getSession(existingSession.socketId)

      expect(result).toEqual(existingSession)
    })

    it('존재하지 않는 socketId로 조회하면 undefined를 반환한다', () => {
      const result = service.getSession('non-existent')

      expect(result).toBeUndefined()
    })
  })

  describe('removeSession', () => {
    it('세션을 삭제하고 삭제된 세션을 반환한다', () => {
      store.set(existingSession.socketId, existingSession)

      const result = service.removeSession(existingSession.socketId)

      expect(result).toEqual(existingSession)
      expect(store.get(existingSession.socketId)).toBeUndefined()
    })

    it('존재하지 않는 socketId를 삭제하면 undefined를 반환한다', () => {
      const result = service.removeSession('non-existent')

      expect(result).toBeUndefined()
    })
  })

  describe('getSessionsByRoom', () => {
    it('특정 roomId의 모든 세션을 반환한다', () => {
      const sessionA: UserSession = {
        ...existingSession,
        socketId: 'socket-1',
        roomId: 'room-1',
        isOwner: true,
      }
      const sessionB: UserSession = {
        ...existingSession,
        socketId: 'socket-2',
        userId: 'user-2',
        roomId: 'room-1',
        isOwner: false,
      }
      const sessionC: UserSession = {
        ...existingSession,
        socketId: 'socket-3',
        userId: 'user-3',
        roomId: 'room-2',
        isOwner: true,
      }

      store.set(sessionA.socketId, sessionA)
      store.set(sessionB.socketId, sessionB)
      store.set(sessionC.socketId, sessionC)

      const result = service.getSessionsByRoom('room-1')

      expect(result).toHaveLength(2)
      expect(result).toContainEqual(sessionA)
      expect(result).toContainEqual(sessionB)
    })

    it('해당 roomId에 세션이 없으면 빈 배열을 반환한다', () => {
      const result = service.getSessionsByRoom('non-existent-room')

      expect(result).toEqual([])
    })
  })

  describe('updateSessionName', () => {
    it('세션 이름을 업데이트하고 업데이트된 세션을 반환한다', () => {
      store.set(existingSession.socketId, existingSession)

      const result = service.updateSessionName(existingSession.socketId, 'newName')

      expect(result).toBeDefined()
      expect(result!.name).toBe('newName')
      expect(store.get(existingSession.socketId)!.name).toBe('newName')
    })

    it('존재하지 않는 socketId로 업데이트하면 undefined를 반환한다', () => {
      const result = service.updateSessionName('non-existent', 'newName')

      expect(result).toBeUndefined()
    })
  })

  describe('transferOwnership', () => {
    const ownerSession: UserSession = {
      ...existingSession,
      socketId: 'socket-1',
      userId: 'user-1',
      isOwner: true,
    }

    const memberSession: UserSession = {
      ...existingSession,
      socketId: 'socket-2',
      userId: 'user-2',
      isOwner: false,
    }

    it('방장 권한을 다른 유저에게 이전한다', () => {
      store.set(ownerSession.socketId, ownerSession)
      store.set(memberSession.socketId, memberSession)

      const result = service.transferOwnership('room-1', 'user-1', 'user-2')

      expect(result).toBe(true)
      expect(store.get('socket-1')!.isOwner).toBe(false)
      expect(store.get('socket-2')!.isOwner).toBe(true)
    })

    it('현재 방장이 아니면 false를 반환한다', () => {
      const notOwner = { ...ownerSession, isOwner: false }
      store.set(notOwner.socketId, notOwner)
      store.set(memberSession.socketId, memberSession)

      const result = service.transferOwnership('room-1', 'user-1', 'user-2')

      expect(result).toBe(false)
    })

    it('현재 방장 세션이 없으면 false를 반환한다', () => {
      store.set(memberSession.socketId, memberSession)

      const result = service.transferOwnership('room-1', 'user-1', 'user-2')

      expect(result).toBe(false)
    })

    it('새 방장 세션이 없으면 false를 반환한다', () => {
      store.set(ownerSession.socketId, ownerSession)

      const result = service.transferOwnership('room-1', 'user-1', 'user-2')

      expect(result).toBe(false)
    })
  })

  describe('getSessionByUserIdInRoom', () => {
    it('특정 방에서 userId로 세션을 조회한다', () => {
      store.set(existingSession.socketId, existingSession)

      const result = service.getSessionByUserIdInRoom('room-1', 'user-1')

      expect(result).toEqual(existingSession)
    })

    it('해당 유저가 없으면 undefined를 반환한다', () => {
      const result = service.getSessionByUserIdInRoom('room-1', 'non-existent')

      expect(result).toBeUndefined()
    })
  })
})
