import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { type Category, Prisma } from '@prisma/client'
import type { Socket } from 'socket.io'
import { CategoryRepository } from './category.repository'
import { SocketBroadcaster } from '@/socket/socket.broadcaster'
import { UserService } from '@/user/user.service'
import { UserSession } from '@/user/user.type'
import { CategoryService } from './category.service'

describe('CategoryService', () => {
  let service: CategoryService

  const roomId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  const userId = 'f9e8d7c6-b5a4-3210-fedc-ba9876543210'
  const categoryId = 'c1d2e3f4-a5b6-7890-cdef-0123456789ab'
  const socketId = 'socket-123'
  const now = new Date()

  const mockCategory: Category = {
    id: categoryId,
    roomId,
    title: '카페',
    orderIndex: 0,
    createdAt: now,
  }

  const mockUserSession: UserSession = {
    socketId,
    userId,
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

  const setServerMock = jest.fn()
  const emitToRoomMock = jest.fn()

  const broadcasterMock = {
    setServer: setServerMock,
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

    service = module.get<CategoryService>(CategoryService)
  })

  describe('findByRoomId', () => {
    it('roomId로 카테고리 목록을 조회한다', async () => {
      const categories: Category[] = [mockCategory]
      categoryRepositoryMock.findByRoomId.mockResolvedValue(categories)

      const result = await service.findByRoomId(roomId)

      expect(result).toEqual(categories)
      expect(categoryRepositoryMock.findByRoomId).toHaveBeenCalledWith(roomId)
    })
  })

  describe('create', () => {
    it('카테고리를 생성한다', async () => {
      const title = '음식'
      categoryRepositoryMock.findByRoomId.mockResolvedValue([])
      categoryRepositoryMock.create.mockResolvedValue({ ...mockCategory, title, orderIndex: 0 })

      const result = await service.create(roomId, title)

      expect(result.title).toBe(title)
      expect(result.orderIndex).toBe(0)
      expect(categoryRepositoryMock.create).toHaveBeenCalledWith({
        roomId,
        title,
        orderIndex: 0,
      })
    })

    it('기존 카테고리가 있으면 orderIndex를 최대값 + 1로 설정한다', async () => {
      const title = '음식'
      const existingCategories: Category[] = [
        { ...mockCategory, id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567891', orderIndex: 0 },
        { ...mockCategory, id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567892', orderIndex: 2 },
      ]
      categoryRepositoryMock.findByRoomId.mockResolvedValue(existingCategories)
      categoryRepositoryMock.create.mockResolvedValue({ ...mockCategory, title, orderIndex: 3 })

      const result = await service.create(roomId, title)

      expect(result.orderIndex).toBe(3)
      expect(categoryRepositoryMock.create).toHaveBeenCalledWith({
        roomId,
        title,
        orderIndex: 3,
      })
    })

    it('카테고리가 10개 이상이면 BadRequestException을 던진다', async () => {
      const existingCategories: Category[] = Array.from({ length: 10 }, (_, i) => ({
        ...mockCategory,
        id: `a1b2c3d4-e5f6-7890-abcd-ef12345678${i.toString().padStart(2, '0')}`,
        orderIndex: i,
      }))
      categoryRepositoryMock.findByRoomId.mockResolvedValue(existingCategories)

      await expect(service.create(roomId, '카페')).rejects.toThrow(BadRequestException)
      expect(categoryRepositoryMock.create).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('카테고리를 삭제한다', async () => {
      const existingCategories: Category[] = [
        { ...mockCategory, id: categoryId },
        { ...mockCategory, id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567891' },
      ]
      categoryRepositoryMock.findByRoomId.mockResolvedValue(existingCategories)
      categoryRepositoryMock.delete.mockResolvedValue(mockCategory)

      const result = await service.delete(categoryId, roomId)

      expect(result).toEqual(mockCategory)
      expect(categoryRepositoryMock.delete).toHaveBeenCalledWith(categoryId)
    })

    it('카테고리가 존재하지 않으면 NotFoundException을 던진다', async () => {
      const nonExistentCategoryId = '99999999-9999-9999-9999-999999999999'
      const existingCategories: Category[] = [
        { ...mockCategory, id: categoryId },
        { ...mockCategory, id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567891' },
      ]
      categoryRepositoryMock.findByRoomId.mockResolvedValue(existingCategories)
      const prismaError = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      })
      categoryRepositoryMock.delete.mockRejectedValue(prismaError)

      await expect(service.delete(nonExistentCategoryId, roomId)).rejects.toThrow(NotFoundException)
      expect(categoryRepositoryMock.delete).toHaveBeenCalledWith(nonExistentCategoryId)
    })

    it('카테고리가 1개 이하면 BadRequestException을 던진다', async () => {
      const existingCategories: Category[] = [{ ...mockCategory, id: categoryId }]
      categoryRepositoryMock.findByRoomId.mockResolvedValue(existingCategories)

      await expect(service.delete(categoryId, roomId)).rejects.toThrow(BadRequestException)
      expect(categoryRepositoryMock.delete).not.toHaveBeenCalled()
    })
  })

  describe('createCategory', () => {
    it('카테고리를 생성하고 브로드캐스트한다', async () => {
      const name = '음식'
      userServiceMock.getSession.mockReturnValue(mockUserSession)
      categoryRepositoryMock.findByRoomId.mockResolvedValue([])
      categoryRepositoryMock.create.mockResolvedValue({ ...mockCategory, title: name, orderIndex: 0 })

      await service.createCategory(mockClient, name)

      expect(getSessionMock).toHaveBeenCalledWith(socketId)
      expect(categoryRepositoryMock.create).toHaveBeenCalledWith({
        roomId,
        title: name,
        orderIndex: 0,
      })
      expect(emitToRoomMock).toHaveBeenCalledWith(roomId, 'category:created', {
        category_id: categoryId,
        room_id: roomId,
        name,
        order: 0,
        created_at: now,
      })
      expect(clientEmitMock).not.toHaveBeenCalled()
    })

    it('세션이 없으면 에러를 클라이언트에 전송한다', async () => {
      const name = '음식'
      userServiceMock.getSession.mockReturnValue(undefined)

      await service.createCategory(mockClient, name)

      expect(getSessionMock).toHaveBeenCalledWith(socketId)
      expect(clientEmitMock).toHaveBeenCalledWith('category:create:error', {
        message: '방에 참여하지 않았습니다.',
      })
      expect(categoryRepositoryMock.create).not.toHaveBeenCalled()
      expect(emitToRoomMock).not.toHaveBeenCalled()
    })

    it('카테고리 생성 실패 시 에러를 클라이언트에 전송한다', async () => {
      const name = '음식'
      userServiceMock.getSession.mockReturnValue(mockUserSession)
      categoryRepositoryMock.findByRoomId.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({
          ...mockCategory,
          id: `a1b2c3d4-e5f6-7890-abcd-ef12345678${i.toString().padStart(2, '0')}`,
          orderIndex: i,
        })),
      )

      await service.createCategory(mockClient, name)

      expect(clientEmitMock).toHaveBeenCalledWith('category:create:error', {
        message: '카테고리 개수 제한을 초과했습니다. (최대 10개)',
      })
      expect(emitToRoomMock).not.toHaveBeenCalled()
    })
  })

  describe('deleteCategory', () => {
    it('카테고리를 삭제하고 브로드캐스트한다', async () => {
      const existingCategories: Category[] = [
        { ...mockCategory, id: categoryId },
        { ...mockCategory, id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567891' },
      ]
      userServiceMock.getSession.mockReturnValue(mockUserSession)
      categoryRepositoryMock.findByRoomId.mockResolvedValue(existingCategories)
      categoryRepositoryMock.delete.mockResolvedValue(mockCategory)

      await service.deleteCategory(mockClient, categoryId)

      expect(getSessionMock).toHaveBeenCalledWith(socketId)
      expect(categoryRepositoryMock.delete).toHaveBeenCalledWith(categoryId)
      expect(emitToRoomMock).toHaveBeenCalledWith(roomId, 'category:deleted', {
        category_id: categoryId,
        deleted_at: expect.any(Date) as Date,
      })
      expect(clientEmitMock).not.toHaveBeenCalled()
    })

    it('세션이 없으면 에러를 클라이언트에 전송한다', async () => {
      userServiceMock.getSession.mockReturnValue(undefined)

      await service.deleteCategory(mockClient, categoryId)

      expect(getSessionMock).toHaveBeenCalledWith(socketId)
      expect(clientEmitMock).toHaveBeenCalledWith('category:delete:error', {
        message: '방에 참여하지 않았습니다.',
      })
      expect(categoryRepositoryMock.delete).not.toHaveBeenCalled()
      expect(emitToRoomMock).not.toHaveBeenCalled()
    })

    it('카테고리 삭제 실패 시 에러를 클라이언트에 전송한다', async () => {
      const existingCategories: Category[] = [{ ...mockCategory, id: categoryId }]
      userServiceMock.getSession.mockReturnValue(mockUserSession)
      categoryRepositoryMock.findByRoomId.mockResolvedValue(existingCategories)

      await service.deleteCategory(mockClient, categoryId)

      expect(clientEmitMock).toHaveBeenCalledWith('category:delete:error', {
        message: '최소 1개의 카테고리는 유지해야 합니다.',
      })
      expect(emitToRoomMock).not.toHaveBeenCalled()
    })
  })
})
