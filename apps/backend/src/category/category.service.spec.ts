import { Test, TestingModule } from '@nestjs/testing'
import { Prisma } from '@prisma/client'
import type { Socket } from 'socket.io'
import { CategoryRepository } from './category.repository'
import { SocketBroadcaster } from '@/socket/socket.broadcaster'
import { UserService } from '@/user/user.service'
import type { UserSession } from '@/user/user.type'
import { CategoryService } from './category.service'

describe('CategoryService (socket handlers only)', () => {
  let service: CategoryService

  const roomId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  const categoryId = 'c1d2e3f4-a5b6-7890-cdef-0123456789ab'
  const socketId = 'socket-123'
  const now = new Date('2026-01-15T00:00:00.000Z')

  const mockCategory = {
    id: categoryId,
    roomId,
    title: '카페',
    orderIndex: 0,
    createdAt: now,
  }

  const mockUserSession: UserSession = {
    socketId,
    userId: 'user-1',
    name: '테스트 사용자',
    color: 'hsl(120, 70%, 50%)',
    roomId,
    joinedAt: now,
  }

  const categoryRepositoryMock = {
    findByRoomId: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  }

  const emitToRoomMock = jest.fn()
  const broadcasterMock = {
    emitToRoom: emitToRoomMock,
  }

  const getSessionMock = jest.fn()
  const userServiceMock = {
    getSession: getSessionMock,
  }

  const clientEmitMock = jest.fn() as (event: string, ...args: unknown[]) => boolean
  const mockClient = {
    id: socketId,
    emit: clientEmitMock,
  } as unknown as Socket

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        { provide: CategoryRepository, useValue: categoryRepositoryMock },
        { provide: SocketBroadcaster, useValue: broadcasterMock },
        { provide: UserService, useValue: userServiceMock },
      ],
    }).compile()

    service = module.get(CategoryService)
  })

  describe('findByRoomId', () => {
    it('roomId로 카테고리 목록을 조회한다', async () => {
      categoryRepositoryMock.findByRoomId.mockResolvedValue([mockCategory])

      const result = await service.findByRoomId(roomId)

      expect(result).toEqual([mockCategory])
      expect(categoryRepositoryMock.findByRoomId).toHaveBeenCalledWith(roomId)
    })
  })

  describe('createCategory', () => {
    it('세션이 없으면 에러를 클라이언트에 전송하고 종료한다', async () => {
      getSessionMock.mockReturnValue(undefined)

      await service.createCategory(mockClient, '음식')

      expect(getSessionMock).toHaveBeenCalledWith(socketId)
      expect(clientEmitMock).toHaveBeenCalledWith('category:error', {
        code: 'NOT_IN_ROOM',
        message: '방에 참여하지 않았습니다.',
      })
      expect(categoryRepositoryMock.findByRoomId).not.toHaveBeenCalled()
      expect(categoryRepositoryMock.create).not.toHaveBeenCalled()
      expect(emitToRoomMock).not.toHaveBeenCalled()
    })

    it('카테고리를 생성하고 브로드캐스트한다 (orderIndex=0)', async () => {
      const name = '음식'
      getSessionMock.mockReturnValue(mockUserSession)
      categoryRepositoryMock.findByRoomId.mockResolvedValue([])
      categoryRepositoryMock.create.mockResolvedValue({ ...mockCategory, title: name, orderIndex: 0 })

      await service.createCategory(mockClient, name)

      expect(getSessionMock).toHaveBeenCalledWith(socketId)
      expect(categoryRepositoryMock.findByRoomId).toHaveBeenCalledWith(roomId)
      expect(categoryRepositoryMock.create).toHaveBeenCalledWith({
        roomId,
        title: name,
        orderIndex: 0,
      })
      expect(emitToRoomMock).toHaveBeenCalledWith(roomId, 'category:created', {
        categoryId,
        name,
      })
      expect(clientEmitMock).not.toHaveBeenCalled()
    })

    it('기존 카테고리가 있으면 orderIndex를 최대값+1로 생성한다', async () => {
      const name = '음식'
      getSessionMock.mockReturnValue(mockUserSession)

      const existing = [
        { ...mockCategory, id: 'c-1', orderIndex: 0 },
        { ...mockCategory, id: 'c-2', orderIndex: 2 },
      ]
      categoryRepositoryMock.findByRoomId.mockResolvedValue(existing)
      categoryRepositoryMock.create.mockResolvedValue({ ...mockCategory, title: name, orderIndex: 3 })

      await service.createCategory(mockClient, name)

      expect(categoryRepositoryMock.create).toHaveBeenCalledWith({
        roomId,
        title: name,
        orderIndex: 3,
      })
      expect(emitToRoomMock).toHaveBeenCalledWith(roomId, 'category:created', {
        categoryId,
        name,
      })
    })

    it('카테고리가 10개 이상이면 에러를 클라이언트에 전송한다', async () => {
      getSessionMock.mockReturnValue(mockUserSession)

      const existing = Array.from({ length: 10 }, (_, i) => ({
        ...mockCategory,
        id: `c-${i}`,
        orderIndex: i,
      }))
      categoryRepositoryMock.findByRoomId.mockResolvedValue(existing)

      await service.createCategory(mockClient, '음식')

      expect(clientEmitMock).toHaveBeenCalledWith('category:error', {
        code: 'BAD_REQUEST',
        message: '카테고리 개수 제한을 초과했습니다. (최대 10개)',
      })
      expect(categoryRepositoryMock.create).not.toHaveBeenCalled()
      expect(emitToRoomMock).not.toHaveBeenCalled()
    })

    it('레포지토리 create가 실패하면 에러를 클라이언트에 전송한다', async () => {
      getSessionMock.mockReturnValue(mockUserSession)
      categoryRepositoryMock.findByRoomId.mockResolvedValue([])
      categoryRepositoryMock.create.mockRejectedValue(new Error('DB down'))

      await service.createCategory(mockClient, '음식')

      expect(clientEmitMock).toHaveBeenCalledWith('category:error', {
        code: 'INTERNAL_ERROR',
        message: 'DB down',
      })
      expect(emitToRoomMock).not.toHaveBeenCalled()
    })
  })

  describe('deleteCategory', () => {
    it('세션이 없으면 에러를 클라이언트에 전송하고 종료한다', async () => {
      getSessionMock.mockReturnValue(undefined)

      await service.deleteCategory(mockClient, categoryId)

      expect(getSessionMock).toHaveBeenCalledWith(socketId)
      expect(clientEmitMock).toHaveBeenCalledWith('category:error', {
        code: 'NOT_IN_ROOM',
        message: '방에 참여하지 않았습니다.',
      })
      expect(categoryRepositoryMock.findByRoomId).not.toHaveBeenCalled()
      expect(categoryRepositoryMock.delete).not.toHaveBeenCalled()
      expect(emitToRoomMock).not.toHaveBeenCalled()
    })

    it('카테고리를 삭제하고 브로드캐스트한다', async () => {
      getSessionMock.mockReturnValue(mockUserSession)
      categoryRepositoryMock.findByRoomId.mockResolvedValue([
        { ...mockCategory, id: categoryId },
        { ...mockCategory, id: 'c-2' },
      ])
      categoryRepositoryMock.delete.mockResolvedValue(mockCategory)

      await service.deleteCategory(mockClient, categoryId)

      expect(categoryRepositoryMock.findByRoomId).toHaveBeenCalledWith(roomId)
      expect(categoryRepositoryMock.delete).toHaveBeenCalledWith(categoryId)

      expect(emitToRoomMock).toHaveBeenCalledWith(roomId, 'category:deleted', {
        categoryId,
      })
      expect(clientEmitMock).not.toHaveBeenCalled()
    })

    it('카테고리가 1개 이하면 에러를 클라이언트에 전송한다', async () => {
      getSessionMock.mockReturnValue(mockUserSession)
      categoryRepositoryMock.findByRoomId.mockResolvedValue([{ ...mockCategory, id: categoryId }])

      await service.deleteCategory(mockClient, categoryId)

      expect(clientEmitMock).toHaveBeenCalledWith('category:error', {
        code: 'BAD_REQUEST',
        message: '최소 1개의 카테고리는 유지해야 합니다.',
      })
      expect(categoryRepositoryMock.delete).not.toHaveBeenCalled()
      expect(emitToRoomMock).not.toHaveBeenCalled()
    })

    it('P2025이면 NotFoundException 메시지로 에러를 클라이언트에 전송한다', async () => {
      getSessionMock.mockReturnValue(mockUserSession)
      categoryRepositoryMock.findByRoomId.mockResolvedValue([
        { ...mockCategory, id: categoryId },
        { ...mockCategory, id: 'c-2' },
      ])

      const prismaError = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      })
      categoryRepositoryMock.delete.mockRejectedValue(prismaError)

      await service.deleteCategory(mockClient, categoryId)

      expect(clientEmitMock).toHaveBeenCalledWith('category:error', {
        code: 'NOT_FOUND',
        message: '카테고리를 찾을 수 없습니다.',
      })
      expect(emitToRoomMock).not.toHaveBeenCalled()
    })

    it('알 수 없는 에러면 기본 메시지로 에러를 클라이언트에 전송한다', async () => {
      getSessionMock.mockReturnValue(mockUserSession)
      categoryRepositoryMock.findByRoomId.mockResolvedValue([
        { ...mockCategory, id: categoryId },
        { ...mockCategory, id: 'c-2' },
      ])
      categoryRepositoryMock.delete.mockRejectedValue('weird') // Error가 아닌 값

      await service.deleteCategory(mockClient, categoryId)

      expect(clientEmitMock).toHaveBeenCalledWith('category:error', {
        code: 'INTERNAL_ERROR',
        message: '카테고리 삭제에 실패했습니다.',
      })
      expect(emitToRoomMock).not.toHaveBeenCalled()
    })
  })
})
