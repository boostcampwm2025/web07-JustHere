import { UserService } from './user.service';
import { UserSessionStore } from './user-session.store';
import type { CreateSessionParams, UserSession } from './user.type';

describe('UserService', () => {
  let service: UserService;
  let store: UserSessionStore;
  const now = new Date();

  const createParams: CreateSessionParams = {
    socketId: 'socket-1',
    userId: 'user-1',
    nickname: 'ajin',
    roomId: 'room-1',
  };

  const existingSession: UserSession = {
    socketId: 'socket-1',
    userId: 'user-1',
    nickname: 'ajin',
    roomId: 'room-1',
    color: 'hsl(100, 70%, 50%)',
    categoryId: null,
    joinedAt: now,
  };

  beforeEach(() => {
    store = new UserSessionStore();
    service = new UserService(store);
  });

  describe('createSession', () => {
    it('새 세션을 생성하고 저장한다', () => {
      const result = service.createSession(createParams);

      expect(result.socketId).toBe(createParams.socketId);
      expect(result.userId).toBe(createParams.userId);
      expect(result.nickname).toBe(createParams.nickname);
      expect(result.roomId).toBe(createParams.roomId);
      expect(result.categoryId).toBeNull();
      expect(result.joinedAt).toBeInstanceOf(Date);
    });

    it('userId 기반으로 일관된 color를 생성한다', () => {
      const result1 = service.createSession(createParams);
      store.delete(createParams.socketId);

      const result2 = service.createSession(createParams);

      expect(result1.color).toBe(result2.color);
    });

    it('color는 hsl 형식이다', () => {
      const result = service.createSession(createParams);

      expect(result.color).toMatch(/^hsl\(\d+, 70%, 50%\)$/);
    });

    it('생성된 세션이 store에 저장된다', () => {
      const result = service.createSession(createParams);

      expect(store.get(createParams.socketId)).toEqual(result);
    });
  });

  describe('getSession', () => {
    it('socketId로 세션을 조회한다', () => {
      store.set(existingSession.socketId, existingSession);

      const result = service.getSession(existingSession.socketId);

      expect(result).toEqual(existingSession);
    });

    it('존재하지 않는 socketId로 조회하면 undefined를 반환한다', () => {
      const result = service.getSession('non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('removeSession', () => {
    it('세션을 삭제하고 삭제된 세션을 반환한다', () => {
      store.set(existingSession.socketId, existingSession);

      const result = service.removeSession(existingSession.socketId);

      expect(result).toEqual(existingSession);
      expect(store.get(existingSession.socketId)).toBeUndefined();
    });

    it('존재하지 않는 socketId를 삭제하면 undefined를 반환한다', () => {
      const result = service.removeSession('non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('moveCategory', () => {
    it('유저의 카테고리를 변경하고 결과를 반환한다', () => {
      store.set(existingSession.socketId, existingSession);

      const result = service.moveCategory(existingSession.socketId, 'cat-1');

      expect(result).toBeDefined();
      expect(result!.from).toBeNull();
      expect(result!.to).toBe('cat-1');
      expect(result!.session.categoryId).toBe('cat-1');
    });

    it('카테고리를 null로 변경할 수 있다', () => {
      const sessionWithCategory: UserSession = {
        ...existingSession,
        categoryId: 'cat-1',
      };
      store.set(sessionWithCategory.socketId, sessionWithCategory);

      const result = service.moveCategory(sessionWithCategory.socketId, null);

      expect(result).toBeDefined();
      expect(result!.from).toBe('cat-1');
      expect(result!.to).toBeNull();
      expect(result!.session.categoryId).toBeNull();
    });

    it('변경된 세션이 store에 저장된다', () => {
      store.set(existingSession.socketId, existingSession);

      service.moveCategory(existingSession.socketId, 'cat-1');

      const stored = store.get(existingSession.socketId);
      expect(stored?.categoryId).toBe('cat-1');
    });

    it('존재하지 않는 socketId로 호출하면 undefined를 반환한다', () => {
      const result = service.moveCategory('non-existent', 'cat-1');

      expect(result).toBeUndefined();
    });
  });

  describe('getSessionsByRoom', () => {
    it('특정 roomId의 모든 세션을 반환한다', () => {
      const sessionA: UserSession = {
        ...existingSession,
        socketId: 'socket-1',
        roomId: 'room-1',
      };
      const sessionB: UserSession = {
        ...existingSession,
        socketId: 'socket-2',
        userId: 'user-2',
        roomId: 'room-1',
      };
      const sessionC: UserSession = {
        ...existingSession,
        socketId: 'socket-3',
        userId: 'user-3',
        roomId: 'room-2',
      };

      store.set(sessionA.socketId, sessionA);
      store.set(sessionB.socketId, sessionB);
      store.set(sessionC.socketId, sessionC);

      const result = service.getSessionsByRoom('room-1');

      expect(result).toHaveLength(2);
      expect(result).toContainEqual(sessionA);
      expect(result).toContainEqual(sessionB);
    });

    it('해당 roomId에 세션이 없으면 빈 배열을 반환한다', () => {
      const result = service.getSessionsByRoom('non-existent-room');

      expect(result).toEqual([]);
    });
  });
});
