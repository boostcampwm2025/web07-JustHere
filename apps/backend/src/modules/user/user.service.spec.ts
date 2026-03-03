import { Test, TestingModule } from '@nestjs/testing'
import { UserService } from './user.service'
import { UserSessionStore } from './user-session.store'
import { CreateSessionParams } from './user.type'

describe('UserService', () => {
  let service: UserService
  let store: UserSessionStore

  const createParams: CreateSessionParams = {
    socketId: 'socket-1',
    userId: 'user-1',
    name: 'user1',
    roomId: 'room-1',
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, UserSessionStore],
    }).compile()

    service = module.get<UserService>(UserService)
    store = module.get<UserSessionStore>(UserSessionStore)
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
      const session = service.createSession(createParams)

      const result = service.getSession(session.socketId)

      expect(result).toEqual(session)
    })

    it('존재하지 않는 socketId로 조회하면 undefined를 반환한다', () => {
      const result = service.getSession('non-existent')

      expect(result).toBeUndefined()
    })
  })

  describe('removeSession', () => {
    it('세션을 삭제하고 삭제된 세션을 반환한다', () => {
      const session = service.createSession(createParams)

      const result = service.removeSession(session.socketId)

      expect(result).toEqual(session)
      expect(store.get(session.socketId)).toBeUndefined()
    })

    it('존재하지 않는 socketId를 삭제하면 undefined를 반환한다', () => {
      const result = service.removeSession('non-existent')

      expect(result).toBeUndefined()
    })
  })

  describe('getSessionsByRoom', () => {
    it('특정 roomId의 모든 세션을 반환한다', () => {
      const sessionA = service.createSession({
        ...createParams,
        socketId: 'socket-1',
        userId: 'user-1',
        roomId: 'room-1',
      })
      const sessionB = service.createSession({
        ...createParams,
        socketId: 'socket-2',
        userId: 'user-2',
        roomId: 'room-1',
      })
      const sessionC = service.createSession({
        ...createParams,
        socketId: 'socket-3',
        userId: 'user-3',
        roomId: 'room-2',
      })

      const result = service.getSessionsByRoom('room-1')

      expect(result).toHaveLength(2)
      expect(result).toContainEqual(sessionA)
      expect(result).toContainEqual(sessionB)
      expect(result).not.toContainEqual(sessionC)
    })

    it('해당 roomId에 세션이 없으면 빈 배열을 반환한다', () => {
      const result = service.getSessionsByRoom('non-existent-room')

      expect(result).toEqual([])
    })
  })

  describe('updateSessionName', () => {
    it('세션 이름을 업데이트하고 업데이트된 세션을 반환한다', () => {
      const session = service.createSession(createParams)

      const result = service.updateSessionName(session.socketId, 'newName')

      expect(result).toBeDefined()
      expect(result!.name).toBe('newName')
      expect(store.get(session.socketId)!.name).toBe('newName')
    })

    it('존재하지 않는 socketId로 업데이트하면 undefined를 반환한다', () => {
      const result = service.updateSessionName('non-existent', 'newName')

      expect(result).toBeUndefined()
    })
  })

  describe('transferOwnership', () => {
    it('방장 권한을 다른 유저에게 이전한다', () => {
      service.createSession({
        ...createParams,
        socketId: 'socket-1',
        userId: 'user-1',
        roomId: 'room-1',
      })
      service.createSession({
        ...createParams,
        socketId: 'socket-2',
        userId: 'user-2',
        roomId: 'room-1',
      })
      const result = service.transferOwnership('room-1', 'user-1', 'user-2')

      expect(result).toBe(true)
      expect(store.get('socket-1')!.isOwner).toBe(false)
      expect(store.get('socket-2')!.isOwner).toBe(true)
    })

    it('현재 방장이 아니면 false를 반환한다', () => {
      // 먼저 입장한 사람이 방장
      service.createSession({
        ...createParams,
        socketId: 'socket-1',
        userId: 'user-1',
        roomId: 'room-1',
      })
      service.createSession({
        ...createParams,
        socketId: 'socket-2',
        userId: 'user-2',
        roomId: 'room-1',
      })

      // user-2(멤버)가 user-1(방장)에게 권한을 주려고 시도
      const result = service.transferOwnership('room-1', 'user-2', 'user-1')

      expect(result).toBe(false)
    })

    it('현재 방장 세션이 없으면 false를 반환한다', () => {
      service.createSession({
        ...createParams,
        socketId: 'socket-2',
        userId: 'user-2',
        roomId: 'room-1',
      })

      const result = service.transferOwnership('room-1', 'user-1', 'user-2')

      expect(result).toBe(false)
    })

    it('새 방장 세션이 없으면 false를 반환한다', () => {
      service.createSession({
        ...createParams,
        socketId: 'socket-1',
        userId: 'user-1',
        roomId: 'room-1',
      })

      const result = service.transferOwnership('room-1', 'user-1', 'user-2')

      expect(result).toBe(false)
    })
  })

  describe('getSessionByUserIdInRoom', () => {
    it('특정 방에서 userId로 세션을 조회한다', () => {
      const session = service.createSession(createParams)

      const result = service.getSessionByUserIdInRoom('room-1', 'user-1')

      expect(result).toEqual(session)
    })

    it('해당 유저가 없으면 undefined를 반환한다', () => {
      const result = service.getSessionByUserIdInRoom('room-1', 'non-existent')

      expect(result).toBeUndefined()
    })
  })
})
