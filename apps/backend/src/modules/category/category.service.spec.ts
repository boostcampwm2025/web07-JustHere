import { CustomException } from '@/lib/exceptions/custom.exception'
import { ErrorType } from '@/lib/types/response.type'
import { Test, TestingModule } from '@nestjs/testing'
import type { Socket } from 'socket.io'
import { CategoryRepository } from './category.repository'
import { RoomBroadcaster } from '@/modules/socket/room.broadcaster'
import { UserService } from '@/modules/user/user.service'
import type { UserSession } from '@/modules/user/user.type'
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
    isOwner: false,
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
        { provide: RoomBroadcaster, useValue: broadcasterMock },
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
    it('세션이 없으면 NotInRoom 예외를 던진다', async () => {
      getSessionMock.mockReturnValue(undefined)

      await expect(service.createCategory(mockClient, '음식')).rejects.toThrow(new CustomException(ErrorType.NotInRoom, '방에 참여하지 않았습니다.'))

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

    it('카테고리가 10개 이상이면 CategoryOverFlowException 예외를 던진다', async () => {
      getSessionMock.mockReturnValue(mockUserSession)

      const existing = Array.from({ length: 10 }, (_, i) => ({
        ...mockCategory,
        id: `c-${i}`,
        orderIndex: i,
      }))
      categoryRepositoryMock.findByRoomId.mockResolvedValue(existing)

      await expect(service.createCategory(mockClient, '음식')).rejects.toThrow(CustomException)

      try {
        await service.createCategory(mockClient, '음식')
      } catch (e) {
        expect(e).toBeInstanceOf(CustomException)
        expect((e as CustomException).type).toBe(ErrorType.CategoryOverFlowException)
      }

      expect(categoryRepositoryMock.create).not.toHaveBeenCalled()
      expect(emitToRoomMock).not.toHaveBeenCalled()
    })
  })

  describe('deleteCategory', () => {
    it('세션이 없으면 NotInRoom 예외를 던진다', async () => {
      getSessionMock.mockReturnValue(undefined)

      await expect(service.deleteCategory(mockClient, categoryId)).rejects.toThrow(
        new CustomException(ErrorType.NotInRoom, '방에 참여하지 않았습니다.'),
      )

      expect(categoryRepositoryMock.delete).not.toHaveBeenCalled()
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

    it('카테고리가 1개 이하면 BadRequest 예외를 던진다', async () => {
      getSessionMock.mockReturnValue(mockUserSession)
      // 1개만 남은 상황 설정
      categoryRepositoryMock.findByRoomId.mockResolvedValue([{ ...mockCategory, id: categoryId }])

      await expect(service.deleteCategory(mockClient, categoryId)).rejects.toThrow(CustomException)

      try {
        await service.deleteCategory(mockClient, categoryId)
      } catch (e) {
        expect((e as CustomException).type).toBe(ErrorType.BadRequest)
      }

      expect(categoryRepositoryMock.delete).not.toHaveBeenCalled()
    })

    it('삭제할 카테고리가 목록에 없으면 NotFound 예외를 던진다', async () => {
      getSessionMock.mockReturnValue(mockUserSession)
      // 목록에는 존재하지만 삭제하려는 ID와 다른 카테고리만 있음
      categoryRepositoryMock.findByRoomId.mockResolvedValue([
        { ...mockCategory, id: 'other-category-id' },
        { ...mockCategory, id: 'another-id' },
      ])

      await expect(service.deleteCategory(mockClient, categoryId)).rejects.toThrow(CustomException)

      try {
        await service.deleteCategory(mockClient, categoryId)
      } catch (e) {
        expect((e as CustomException).type).toBe(ErrorType.NotFound)
      }

      expect(categoryRepositoryMock.delete).not.toHaveBeenCalled()
    })
  })
})
