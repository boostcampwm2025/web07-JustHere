import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common'
import { type Category, type Room, Prisma } from '@prisma/client'
import { RoomRepository } from '@/room/room.repository'
import { UserService } from '@/user/user.service'
import { UserSession } from '@/user/user.type'
import { CategoryService } from './category.service'
import { CategoryRepository } from './category.repository'

describe('CategoryService', () => {
  let service: CategoryService

  const roomId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  const userId = 'f9e8d7c6-b5a4-3210-fedc-ba9876543210'
  const categoryId = 'c1d2e3f4-a5b6-7890-cdef-0123456789ab'
  const now = new Date()

  const mockCategory: Category = {
    id: categoryId,
    roomId,
    title: '카페',
    orderIndex: 0,
    createdAt: now,
  }

  const mockRoom: Room = {
    id: roomId,
    slug: 'test-room-slug-123',
    title: '테스트 방',
    x: 127.0276,
    y: 37.4979,
    place_name: '서울시 강남구',
    createdAt: now,
    updatedAt: now,
  }

  const mockUserSession: UserSession = {
    socketId: 'socket-123',
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

  const roomRepositoryMock = {
    findById: jest.fn(),
    findBySlug: jest.fn(),
  }

  const userServiceMock = {
    getSessionsByRoom: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        { provide: CategoryRepository, useValue: categoryRepositoryMock },
        { provide: RoomRepository, useValue: roomRepositoryMock },
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
    beforeEach(() => {
      userServiceMock.getSessionsByRoom.mockReturnValue([mockUserSession])
    })

    it('카테고리를 생성한다', async () => {
      const title = '음식'
      roomRepositoryMock.findById.mockResolvedValue(mockRoom)
      categoryRepositoryMock.findByRoomId.mockResolvedValue([])
      categoryRepositoryMock.create.mockResolvedValue({ ...mockCategory, title, orderIndex: 0 })

      const result = await service.create(roomId, title, userId)

      expect(result.title).toBe(title)
      expect(result.orderIndex).toBe(0)
      expect(userServiceMock.getSessionsByRoom).toHaveBeenCalledWith(roomId)
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
      roomRepositoryMock.findById.mockResolvedValue(mockRoom)
      categoryRepositoryMock.findByRoomId.mockResolvedValue(existingCategories)
      categoryRepositoryMock.create.mockResolvedValue({ ...mockCategory, title, orderIndex: 3 })

      const result = await service.create(roomId, title, userId)

      expect(result.orderIndex).toBe(3)
      expect(userServiceMock.getSessionsByRoom).toHaveBeenCalledWith(roomId)
      expect(categoryRepositoryMock.create).toHaveBeenCalledWith({
        roomId,
        title,
        orderIndex: 3,
      })
    })

    it('room slug로 카테고리를 생성할 수 있다', async () => {
      const slug = 'test-room-slug-123'
      const title = '음식'
      roomRepositoryMock.findById.mockResolvedValue(null) // UUID가 아니므로 null
      roomRepositoryMock.findBySlug.mockResolvedValue(mockRoom)
      categoryRepositoryMock.findByRoomId.mockResolvedValue([])
      categoryRepositoryMock.create.mockResolvedValue({ ...mockCategory, title, orderIndex: 0 })

      const result = await service.create(slug, title, userId)

      expect(result.title).toBe(title)
      expect(roomRepositoryMock.findBySlug).toHaveBeenCalledWith(slug)
      expect(userServiceMock.getSessionsByRoom).toHaveBeenCalledWith(roomId)
      expect(categoryRepositoryMock.create).toHaveBeenCalledWith({
        roomId: mockRoom.id,
        title,
        orderIndex: 0,
      })
    })

    it('방이 존재하지 않으면 NotFoundException을 던진다', async () => {
      roomRepositoryMock.findById.mockResolvedValue(null)
      roomRepositoryMock.findBySlug.mockResolvedValue(null)

      await expect(service.create('invalid-slug', '카페', userId)).rejects.toThrow(NotFoundException)
      expect(categoryRepositoryMock.create).not.toHaveBeenCalled()
      expect(userServiceMock.getSessionsByRoom).not.toHaveBeenCalled()
    })

    it('카테고리가 10개 이상이면 BadRequestException을 던진다', async () => {
      const existingCategories: Category[] = Array.from({ length: 10 }, (_, i) => ({
        ...mockCategory,
        id: `a1b2c3d4-e5f6-7890-abcd-ef12345678${i.toString().padStart(2, '0')}`,
        orderIndex: i,
      }))
      roomRepositoryMock.findById.mockResolvedValue(mockRoom)
      categoryRepositoryMock.findByRoomId.mockResolvedValue(existingCategories)

      await expect(service.create(roomId, '카페', userId)).rejects.toThrow(BadRequestException)
      expect(userServiceMock.getSessionsByRoom).toHaveBeenCalledWith(roomId)
      expect(categoryRepositoryMock.create).not.toHaveBeenCalled()
    })

    it('해당 방에 속한 사용자가 아니면 ForbiddenException을 던진다', async () => {
      const unauthorizedUserId = '99999999-9999-9999-9999-999999999999'
      userServiceMock.getSessionsByRoom.mockReturnValue([mockUserSession])
      roomRepositoryMock.findById.mockResolvedValue(mockRoom)

      await expect(service.create(roomId, '카페', unauthorizedUserId)).rejects.toThrow(ForbiddenException)
      expect(userServiceMock.getSessionsByRoom).toHaveBeenCalledWith(roomId)
      expect(categoryRepositoryMock.create).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    beforeEach(() => {
      userServiceMock.getSessionsByRoom.mockReturnValue([mockUserSession])
    })

    it('카테고리를 삭제한다', async () => {
      const existingCategories: Category[] = [
        { ...mockCategory, id: categoryId },
        { ...mockCategory, id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567891' },
      ]
      roomRepositoryMock.findById.mockResolvedValue(mockRoom)
      categoryRepositoryMock.findByRoomId.mockResolvedValue(existingCategories)
      categoryRepositoryMock.delete.mockResolvedValue(mockCategory)

      const result = await service.delete(categoryId, roomId, userId)

      expect(result).toEqual(mockCategory)
      expect(userServiceMock.getSessionsByRoom).toHaveBeenCalledWith(roomId)
      expect(categoryRepositoryMock.delete).toHaveBeenCalledWith(categoryId)
    })

    it('방이 존재하지 않으면 NotFoundException을 던진다', async () => {
      roomRepositoryMock.findById.mockResolvedValue(null)
      roomRepositoryMock.findBySlug.mockResolvedValue(null)

      await expect(service.delete(categoryId, 'invalid-slug', userId)).rejects.toThrow(NotFoundException)
      expect(categoryRepositoryMock.delete).not.toHaveBeenCalled()
      expect(userServiceMock.getSessionsByRoom).not.toHaveBeenCalled()
    })

    it('카테고리가 존재하지 않으면 NotFoundException을 던진다', async () => {
      const nonExistentCategoryId = '99999999-9999-9999-9999-999999999999'
      const existingCategories: Category[] = [
        { ...mockCategory, id: categoryId },
        { ...mockCategory, id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567891' },
      ]
      roomRepositoryMock.findById.mockResolvedValue(mockRoom)
      categoryRepositoryMock.findByRoomId.mockResolvedValue(existingCategories)
      const prismaError = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      })
      categoryRepositoryMock.delete.mockRejectedValue(prismaError)

      await expect(service.delete(nonExistentCategoryId, roomId, userId)).rejects.toThrow(NotFoundException)
      expect(userServiceMock.getSessionsByRoom).toHaveBeenCalledWith(roomId)
      expect(categoryRepositoryMock.delete).toHaveBeenCalledWith(nonExistentCategoryId)
    })

    it('카테고리가 1개 이하면 BadRequestException을 던진다', async () => {
      const existingCategories: Category[] = [{ ...mockCategory, id: categoryId }]
      roomRepositoryMock.findById.mockResolvedValue(mockRoom)
      categoryRepositoryMock.findByRoomId.mockResolvedValue(existingCategories)

      await expect(service.delete(categoryId, roomId, userId)).rejects.toThrow(BadRequestException)
      expect(userServiceMock.getSessionsByRoom).toHaveBeenCalledWith(roomId)
      expect(categoryRepositoryMock.delete).not.toHaveBeenCalled()
    })

    it('해당 방에 속한 사용자가 아니면 ForbiddenException을 던진다', async () => {
      const unauthorizedUserId = '99999999-9999-9999-9999-999999999999'
      const existingCategories: Category[] = [
        { ...mockCategory, id: categoryId },
        { ...mockCategory, id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567891' },
      ]
      userServiceMock.getSessionsByRoom.mockReturnValue([mockUserSession])
      roomRepositoryMock.findById.mockResolvedValue(mockRoom)
      categoryRepositoryMock.findByRoomId.mockResolvedValue(existingCategories)

      await expect(service.delete(categoryId, roomId, unauthorizedUserId)).rejects.toThrow(ForbiddenException)
      expect(userServiceMock.getSessionsByRoom).toHaveBeenCalledWith(roomId)
      expect(categoryRepositoryMock.delete).not.toHaveBeenCalled()
    })
  })
})
